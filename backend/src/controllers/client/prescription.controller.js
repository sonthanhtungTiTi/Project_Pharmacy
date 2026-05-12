const Product = require('../../models/product.model')
const Order = require('../../models/order.model')

/**
 * Tạo đơn hàng kê đơn — trạng thái PENDING_PRESCRIPTION.
 * Đơn này không cần shippingAddress ở bước đầu.
 */
const createRequest = async (req, res) => {
    try {
        const { productId, prescriptionImage } = req.body
        const userId = req.user.userId || req.user.id

        if (!productId || !prescriptionImage) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp productId và hình ảnh đơn thuốc'
            })
        }

        const product = await Product.findById(productId).lean()
        if (!product) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' })
        }

        if (!product.requiresPrescription) {
            return res.status(400).json({
                success: false,
                message: 'Sản phẩm này không yêu cầu đơn thuốc'
            })
        }

        // Lấy giá số từ chuỗi hoặc giữ nguyên nếu là số
        const unitPrice = typeof product.price === 'number'
            ? product.price
            : Number(String(product.price || '0').replace(/[^0-9.]/g, '')) || 0

        // Lấy ảnh đầu tiên của sản phẩm
        const productImage = Array.isArray(product.images)
            ? (product.images[0] || '')
            : String(product.images || '').split(';')[0]?.trim() || ''

        // Tạo mã đơn hàng duy nhất
        const orderCode = `RX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

        const order = await Order.create({
            orderCode,
            userId,
            items: [{
                productId: product._id,
                medicineCode: product.medicineCode || '',
                productName: product.productName || product.medicineName || '',
                productImage,
                requiresPrescription: true,
                unitPrice,
                quantity: 1,
                lineTotal: unitPrice,
            }],
            totalQuantity: 1,
            totalAmount: unitPrice,
            status: 'pending_prescription',
            prescriptionImage,
            prescriptionStatus: 'pending',
            paymentMethod: 'cod',
        })

        // Emit socket tới tất cả admin/staff online
        const io = req.app.get('io')
        if (io) {
            // Lấy onlineUsers từ app context nếu có
            const onlineUsers = req.app.get('onlineUsers')
            const ADMIN_ROLES = new Set(['admin', 'pharmacist', 'staff', 'support'])

            const orderPayload = {
                orderId: order._id,
                orderCode: order.orderCode,
                productName: product.productName || product.medicineName || '',
                productImage,
                prescriptionImage,
                userId,
                createdAt: order.createdAt,
            }

            if (onlineUsers && typeof onlineUsers.values === 'function') {
                for (const u of onlineUsers.values()) {
                    if (ADMIN_ROLES.has(String(u.role || ''))) {
                        io.to(String(u.userId)).emit('new_prescription_order', orderPayload)
                    }
                }
            } else {
                // Fallback: emit vào room 'admin'
                io.emit('new_prescription_order', orderPayload)
            }
        }

        return res.status(201).json({
            success: true,
            message: 'Đã gửi yêu cầu tư vấn thành công',
            data: {
                orderId: order._id,
                orderCode: order.orderCode,
                status: order.status,
            }
        })
    } catch (error) {
        console.error('Error in createRequest:', error)
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ',
            error: error.message
        })
    }
}

const getMyRequests = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id
        const orders = await Order.find({
            userId,
            status: { $in: ['pending_prescription', 'approved', 'rejected'] }
        })
            .select('orderCode status prescriptionStatus prescriptionImage items placedAt createdAt')
            .sort({ createdAt: -1 })
            .lean()

        return res.status(200).json({ success: true, data: orders })
    } catch (error) {
        console.error('Error in getMyRequests:', error)
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ',
            error: error.message
        })
    }
}

module.exports = { createRequest, getMyRequests }
