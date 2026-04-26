const mongoose = require('mongoose')

const Order = require('../../models/order.model')

class AdminOrderServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

const serializeOrder = (orderDoc) => ({
	id: String(orderDoc._id),
	orderCode: orderDoc.orderCode,
	status: orderDoc.status,
	paymentMethod: orderDoc.paymentMethod,
	paymentStatus: orderDoc.paymentStatus,
	totalQuantity: orderDoc.totalQuantity,
	totalAmount: orderDoc.totalAmount,
	note: orderDoc.note || '',
	adminNote: orderDoc.adminNote || '',
	cancelReason: orderDoc.cancelReason || '',
	placedAt: orderDoc.placedAt,
	createdAt: orderDoc.createdAt,
	updatedAt: orderDoc.updatedAt,
	customer: {
		id: orderDoc.userId?._id ? String(orderDoc.userId._id) : String(orderDoc.userId || ''),
		fullName: orderDoc.userId?.fullName || '',
		email: orderDoc.userId?.email || '',
		phone: orderDoc.userId?.phone || '',
	},
	shippingAddress: {
		addressId: String(orderDoc.shippingAddress.addressId),
		label: orderDoc.shippingAddress.label || 'other',
		recipientName: orderDoc.shippingAddress.recipientName,
		phone: orderDoc.shippingAddress.phone,
		provinceName: orderDoc.shippingAddress.provinceName,
		districtName: orderDoc.shippingAddress.districtName,
		wardName: orderDoc.shippingAddress.wardName,
		street: orderDoc.shippingAddress.street,
		note: orderDoc.shippingAddress.note || '',
		fullAddress: orderDoc.shippingAddress.fullAddress,
	},
	items: (orderDoc.items || []).map((item) => ({
		productId: String(item.productId),
		medicineCode: item.medicineCode || '',
		productName: item.productName,
		productImage: item.productImage || '',
		unitPrice: item.unitPrice,
		quantity: item.quantity,
		lineTotal: item.lineTotal,
	})),
})

const listOrders = async ({ status, page = 1, limit = 20, keyword } = {}) => {
	const numericPage = Math.max(1, Number(page) || 1)
	const numericLimit = Math.min(100, Math.max(1, Number(limit) || 20))
	const skip = (numericPage - 1) * numericLimit

	const filter = {}

	if (status) {
		filter.status = String(status)
	}

	if (keyword) {
		const regex = { $regex: String(keyword).trim(), $options: 'i' }
		filter.$or = [
			{ orderCode: regex },
			{ 'shippingAddress.recipientName': regex },
			{ 'shippingAddress.phone': regex },
		]
	}

	const [orders, total] = await Promise.all([
		Order.find(filter)
			.populate('userId', 'fullName email phone')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(numericLimit),
		Order.countDocuments(filter),
	])

	return {
		items: orders.map(serializeOrder),
		pagination: {
			page: numericPage,
			limit: numericLimit,
			total,
			totalPages: Math.max(1, Math.ceil(total / numericLimit)),
		},
	}
}

const getOrderDetail = async (orderId) => {
	if (!mongoose.Types.ObjectId.isValid(orderId)) {
		throw new AdminOrderServiceError('orderId is invalid', 400)
	}

	const order = await Order.findById(orderId).populate('userId', 'fullName email phone')
	if (!order) {
		throw new AdminOrderServiceError('Order not found', 404)
	}

	return serializeOrder(order)
}

const updateOrderStatus = async (orderId, { status, paymentStatus, adminNote } = {}) => {
	if (!mongoose.Types.ObjectId.isValid(orderId)) {
		throw new AdminOrderServiceError('orderId is invalid', 400)
	}

	const allowedStatus = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled']
	const allowedPaymentStatus = ['unpaid', 'pending', 'paid', 'failed', 'refunded']
	const statusTransitions = {
		pending: new Set(['confirmed', 'cancelled']),
		confirmed: new Set(['shipping', 'cancelled']),
		shipping: new Set(['completed']),
		completed: new Set(),
		cancelled: new Set(),
	}

	const order = await Order.findById(orderId).populate('userId', 'fullName email phone')
	if (!order) {
		throw new AdminOrderServiceError('Order not found', 404)
	}

	if (status) {
		if (!allowedStatus.includes(status)) {
			throw new AdminOrderServiceError('status is invalid', 400)
		}

		const currentStatus = String(order.status)
		if (status !== currentStatus) {
			const allowedNextStatus = statusTransitions[currentStatus] || new Set()
			if (!allowedNextStatus.has(status)) {
				throw new AdminOrderServiceError(`Cannot change status from ${currentStatus} to ${status}`, 400)
			}
		}

		order.status = status
	}

	if (paymentStatus) {
		if (!allowedPaymentStatus.includes(paymentStatus)) {
			throw new AdminOrderServiceError('paymentStatus is invalid', 400)
		}
		order.paymentStatus = paymentStatus
	}

	if (typeof adminNote === 'string') {
		order.adminNote = adminNote.trim()
	}

	await order.save()

	return serializeOrder(order)
}

const updateOrderPaymentStatus = async (orderId, { paymentStatus, adminNote, cancelReason } = {}) => {
	if (!mongoose.Types.ObjectId.isValid(orderId)) {
		throw new AdminOrderServiceError('orderId is invalid', 400)
	}

	const allowedPaymentStatus = ['pending', 'paid', 'failed']
	if (!allowedPaymentStatus.includes(paymentStatus)) {
		throw new AdminOrderServiceError('paymentStatus is invalid', 400)
	}

	const transitions = {
		unpaid: new Set(['pending', 'paid', 'failed']),
		pending: new Set(['paid', 'failed']),
		paid: new Set(),
		failed: new Set(),
		refunded: new Set(),
	}

	const order = await Order.findById(orderId).populate('userId', 'fullName email phone')
	if (!order) {
		throw new AdminOrderServiceError('Order not found', 404)
	}

	const currentPaymentStatus = String(order.paymentStatus)
	if (paymentStatus !== currentPaymentStatus) {
		const allowedNext = transitions[currentPaymentStatus] || new Set()
		if (!allowedNext.has(paymentStatus)) {
			throw new AdminOrderServiceError(
				`Cannot change paymentStatus from ${currentPaymentStatus} to ${paymentStatus}`,
				400,
			)
		}
	}

	order.paymentStatus = paymentStatus

	if (paymentStatus === 'paid') {
		order.paymentDate = new Date()
	}

	if (paymentStatus === 'failed') {
		order.status = 'cancelled'
		if (typeof cancelReason === 'string' && cancelReason.trim()) {
			order.cancelReason = cancelReason.trim()
		} else if (!order.cancelReason) {
			order.cancelReason = 'Thanh toan that bai'
		}
	}

	if (typeof adminNote === 'string') {
		order.adminNote = adminNote.trim()
	}

	await order.save()

	return serializeOrder(order)
}

module.exports = {
	AdminOrderServiceError,
	listOrders,
	getOrderDetail,
	updateOrderStatus,
	updateOrderPaymentStatus,
}
