const Order = require('../../models/order.model')
const Cart = require('../../models/cart.model')
const Product = require('../../models/product.model')

/**
 * Lấy danh sách đơn hàng kê đơn chờ duyệt (và đã xử lý)
 */
const getRequests = async (req, res) => {
    try {
        const { status = 'pending_prescription', page = 1, limit = 20 } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const filter = status === 'all'
            ? { status: { $in: ['pending_prescription', 'approved', 'rejected'] } }
            : { status }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('userId', 'fullName email phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Order.countDocuments(filter)
        ])

        return res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        })
    } catch (error) {
        console.error('Error in getRequests:', error)
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message })
    }
}

/**
 * Duyệt đơn kê đơn:
 * 1. Đổi status -> approved, prescriptionStatus -> validated
 * 2. Tự động thêm sản phẩm vào giỏ hàng của User
 * 3. Emit socket prescription_approved tới client
 */
const approveRequest = async (req, res) => {
    try {
        const { id } = req.params
        const adminId = req.user.userId || req.user.id

        const order = await Order.findById(id)
        if (!order) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' })
        }

        if (order.status !== 'pending_prescription') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể duyệt đơn đang ở trạng thái Chờ duyệt đơn thuốc'
            })
        }

        // Cập nhật trạng thái
        order.status = 'approved'
        order.prescriptionStatus = 'validated'
        order.pharmacistId = adminId
        await order.save()

        // Tự động thêm vào giỏ hàng
        const firstItem = order.items[0]
        if (firstItem) {
            // Lấy thông tin sản phẩm đầy đủ
            const product = await Product.findById(firstItem.productId).lean()
            const productImage = product
                ? (Array.isArray(product.images)
                    ? (product.images[0] || '')
                    : String(product.images || '').split(';')[0]?.trim() || '')
                : firstItem.productImage

            let cart = await Cart.findOne({ userId: order.userId })
            if (!cart) {
                cart = new Cart({ userId: order.userId, items: [] })
            }

            // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
            const existingIdx = cart.items.findIndex(
                (i) => i.productId.toString() === firstItem.productId.toString()
            )

            if (existingIdx >= 0) {
                cart.items[existingIdx].quantity += 1
            } else {
                cart.items.push({
                    productId: firstItem.productId,
                    medicineCode: firstItem.medicineCode || product?.medicineCode || '',
                    productName: firstItem.productName,
                    productImage,
                    requiresPrescription: true,
                    unitPrice: firstItem.unitPrice,
                    quantity: 1,
                })
            }

            await cart.save()
        }

        // Emit socket tới client
        const io = req.app.get('io')
        if (io) {
            io.to(String(order.userId)).emit('prescription_approved', {
                orderId: order._id,
                orderCode: order.orderCode,
                message: 'Đơn thuốc của bạn đã được duyệt! Sản phẩm đã tự động thêm vào giỏ hàng của bạn.'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Duyệt đơn thành công',
            data: order
        })
    } catch (error) {
        console.error('Error in approveRequest:', error)
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message })
    }
}

/**
 * Từ chối đơn kê đơn:
 * 1. Đổi status -> rejected, prescriptionStatus -> rejected
 * 2. Emit socket prescription_rejected tới client
 */
const rejectRequest = async (req, res) => {
    try {
        const { id } = req.params
        const { adminMessage } = req.body
        const adminId = req.user.userId || req.user.id

        const order = await Order.findById(id)
        if (!order) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' })
        }

        if (order.status !== 'pending_prescription') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể từ chối đơn đang ở trạng thái Chờ duyệt đơn thuốc'
            })
        }

        order.status = 'rejected'
        order.prescriptionStatus = 'rejected'
        order.pharmacistId = adminId
        order.adminNote = adminMessage || 'Đơn thuốc không hợp lệ'
        order.cancelReason = adminMessage || 'Đơn thuốc không hợp lệ'
        await order.save()

        // Emit socket tới client
        const io = req.app.get('io')
        if (io) {
            io.to(String(order.userId)).emit('prescription_rejected', {
                orderId: order._id,
                orderCode: order.orderCode,
                message: 'Đơn thuốc của bạn không được duyệt. Vui lòng liên hệ dược sĩ để biết thêm chi tiết.'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Đã từ chối đơn',
            data: order
        })
    } catch (error) {
        console.error('Error in rejectRequest:', error)
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message })
    }
}

module.exports = { getRequests, approveRequest, rejectRequest }
