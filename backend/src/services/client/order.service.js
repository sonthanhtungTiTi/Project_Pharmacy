const mongoose = require('mongoose')

const Cart = require('../../models/cart.model')
const Address = require('../../models/address.model')
const Order = require('../../models/order.model')

class OrderServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

const normalizeText = (value) => String(value || '').trim()

const createOrderCode = () => {
	const now = new Date()
	const pad = (value) => String(value).padStart(2, '0')
	const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
	const randomSuffix = Math.floor(1000 + Math.random() * 9000)
	return `ORD${timestamp}${randomSuffix}`
}

const toFullAddress = (addressDoc) => {
	const parts = [
		normalizeText(addressDoc.street),
		normalizeText(addressDoc.wardName),
		normalizeText(addressDoc.districtName),
		normalizeText(addressDoc.provinceName),
	].filter(Boolean)

	return parts.join(', ')
}

const serializeOrder = (orderDoc) => {
	return {
		id: String(orderDoc._id),
		orderCode: orderDoc.orderCode,
		userId: String(orderDoc.userId),
		status: orderDoc.status,
		paymentMethod: orderDoc.paymentMethod,
		paymentStatus: orderDoc.paymentStatus,
		bankTransferInfo: null,
		transactionId: orderDoc.transactionId || null,
		paymentDate: orderDoc.paymentDate || null,
		totalQuantity: orderDoc.totalQuantity,
		totalAmount: orderDoc.totalAmount,
		note: orderDoc.note || '',
		adminNote: orderDoc.adminNote || '',
		cancelReason: orderDoc.cancelReason || '',
		placedAt: orderDoc.placedAt,
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
		createdAt: orderDoc.createdAt,
		updatedAt: orderDoc.updatedAt,
	}
}

const ensureValidObjectId = (value, fieldName) => {
	if (!mongoose.Types.ObjectId.isValid(value)) {
		throw new OrderServiceError(`${fieldName} is invalid`, 400)
	}
}

const allowedPaymentMethods = new Set(['cod', 'bank_transfer', 'e_wallet', 'momo'])

const getInitialPaymentStatus = (paymentMethod) => {
	if (paymentMethod === 'bank_transfer') {
		return 'pending'
	}

	return 'unpaid'
}

const normalizeSelectedProductIds = (selectedProductIds) => {
	if (!Array.isArray(selectedProductIds) || selectedProductIds.length === 0) {
		return []
	}

	const ids = selectedProductIds
		.map((value) => String(value || '').trim())
		.filter(Boolean)

	return Array.from(new Set(ids))
}

const checkoutFromCart = async (userId, { addressId, note, paymentMethod = 'cod', selectedProductIds = [] } = {}) => {
	ensureValidObjectId(userId, 'userId')
	ensureValidObjectId(addressId, 'addressId')

	if (!allowedPaymentMethods.has(paymentMethod)) {
		throw new OrderServiceError('Payment method is invalid', 400)
	}

	const [cart, address] = await Promise.all([
		Cart.findOne({ userId }),
		Address.findOne({ _id: addressId, userId }),
	])

	if (!address) {
		throw new OrderServiceError('Shipping address not found', 404)
	}

	if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
		throw new OrderServiceError('Cart is empty', 400)
	}

	const normalizedSelectedProductIds = normalizeSelectedProductIds(selectedProductIds)
	const shouldCheckoutSelectedItems = normalizedSelectedProductIds.length > 0
	const selectedProductIdSet = new Set(normalizedSelectedProductIds)

	const checkoutItemsSource = shouldCheckoutSelectedItems
		? cart.items.filter((item) => selectedProductIdSet.has(String(item.productId)))
		: cart.items

	if (checkoutItemsSource.length === 0) {
		throw new OrderServiceError('No selected items found in cart', 400)
	}

	const items = checkoutItemsSource.map((item) => {
		const quantity = Math.max(1, Number(item.quantity) || 1)
		const unitPrice = Math.max(0, Number(item.unitPrice) || 0)
		const lineTotal = quantity * unitPrice

		if (lineTotal <= 0) {
			throw new OrderServiceError(`Invalid item price for ${item.productName}`, 400)
		}

		return {
			productId: item.productId,
			medicineCode: item.medicineCode || '',
			productName: item.productName,
			productImage: item.productImage || '',
			unitPrice,
			quantity,
			lineTotal,
		}
	})

	const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
	const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0)

	if (totalAmount <= 0) {
		throw new OrderServiceError('Total amount is invalid', 400)
	}

	let orderDoc = null
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			orderDoc = await Order.create({
				orderCode: createOrderCode(),
				userId,
				shippingAddress: {
					addressId: address._id,
					label: address.label,
					recipientName: address.recipientName,
					phone: address.phone,
					provinceName: address.provinceName,
					districtName: address.districtName,
					wardName: address.wardName,
					street: address.street,
					note: address.note || '',
					fullAddress: toFullAddress(address),
				},
				items,
				totalQuantity,
				totalAmount,
				paymentMethod,
				paymentStatus: getInitialPaymentStatus(paymentMethod),
				note: normalizeText(note),
			})
			break
		} catch (error) {
			if (error?.code === 11000 && attempt < 2) {
				continue
			}
			throw error
		}
	}

	// Clear items from cart only for COD. For online payments, items are kept until payment success.
	if (paymentMethod === 'cod') {
		if (shouldCheckoutSelectedItems) {
			cart.items = cart.items.filter((item) => !selectedProductIdSet.has(String(item.productId)))
		} else {
			cart.items = []
		}
		await cart.save()
	}

	return serializeOrder(orderDoc)
}

const getMyOrders = async (userId, { status, page = 1, limit = 10 } = {}) => {
	ensureValidObjectId(userId, 'userId')

	const numericPage = Math.max(1, Number(page) || 1)
	const numericLimit = Math.min(100, Math.max(1, Number(limit) || 10))
	const skip = (numericPage - 1) * numericLimit

	const filter = { userId }
	if (status) {
		filter.status = String(status)
	}

	const [orders, total] = await Promise.all([
		Order.find(filter)
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

const getMyOrderDetail = async (userId, orderId) => {
	ensureValidObjectId(userId, 'userId')
	ensureValidObjectId(orderId, 'orderId')

	const order = await Order.findOne({ _id: orderId, userId })
	if (!order) {
		throw new OrderServiceError('Order not found', 404)
	}

	return serializeOrder(order)
}

const cancelMyOrder = async (userId, orderId, { cancelReason } = {}) => {
	ensureValidObjectId(userId, 'userId')
	ensureValidObjectId(orderId, 'orderId')

	const order = await Order.findOne({ _id: orderId, userId })
	if (!order) {
		throw new OrderServiceError('Order not found', 404)
	}

	if (order.paymentStatus === 'paid') {
		throw new OrderServiceError('Cannot cancel paid order', 400)
	}

	if (order.status !== 'pending') {
		throw new OrderServiceError('Only pending orders can be cancelled', 400)
	}

	order.status = 'cancelled'
	order.cancelReason = normalizeText(cancelReason)
	await order.save()

	return serializeOrder(order)
}

module.exports = {
	OrderServiceError,
	checkoutFromCart,
	getMyOrders,
	getMyOrderDetail,
	cancelMyOrder,
}
