const mongoose = require('mongoose')

const Cart = require('../../models/cart.model')
const Product = require('../../models/product.model')

class CartServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

const parsePriceNumber = (price) => {
	const digits = String(price || '').replace(/[^0-9]/g, '')
	return digits ? Number(digits) : 0
}

const extractFirstImage = (images) => {
	if (!images) {
		return ''
	}

	return String(images)
		.split(';')
		.map((item) => item.trim())
		.find((item) => item.length > 0) || ''
}

const syncCartItemsWithProducts = async (cart) => {
	if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
		return cart
	}

	const productIds = cart.items.map((item) => item.productId).filter(Boolean)
	if (productIds.length === 0) {
		return cart
	}

	const products = await Product.find({
		_id: { $in: productIds },
		isActive: { $ne: false },
	})
		.select('_id productName medicineCode images price')
		.lean()

	const productMap = new Map(products.map((product) => [String(product._id), product]))
	let hasChanges = false
	const nextItems = []

	for (const item of cart.items) {
		const product = productMap.get(String(item.productId))
		if (!product) {
			hasChanges = true
			continue
		}

		const unitPrice = parsePriceNumber(product.price)
		const productName = product.productName || item.productName
		const productImage = extractFirstImage(product.images)
		const medicineCode = product.medicineCode || ''

		if (
			item.unitPrice !== unitPrice ||
			item.productName !== productName ||
			item.productImage !== productImage ||
			item.medicineCode !== medicineCode
		) {
			hasChanges = true
		}

		nextItems.push({
			...item,
			unitPrice,
			productName,
			productImage,
			medicineCode,
		})
	}

	if (nextItems.length !== cart.items.length) {
		hasChanges = true
	}

	if (hasChanges) {
		cart.items = nextItems
		await cart.save()
	}

	return cart
}

const serializeCart = (cartDoc) => {
	const items = (cartDoc?.items || []).map((item) => {
		const quantity = Math.max(1, Number(item.quantity) || 1)
		const unitPrice = Math.max(0, Number(item.unitPrice) || 0)
		const lineTotal = quantity * unitPrice

		return {
			productId: String(item.productId),
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

	return {
		userId: cartDoc ? String(cartDoc.userId) : '',
		items,
		totalQuantity,
		totalAmount,
		updatedAt: cartDoc?.updatedAt || null,
	}
}

const ensureCart = async (userId) => {
	let cart = await Cart.findOne({ userId })

	if (!cart) {
		cart = await Cart.create({
			userId,
			items: [],
		})
	}

	return cart
}

const getCartByUserId = async (userId) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new CartServiceError('userId is invalid', 400)
	}

	const cart = await ensureCart(userId)
	const syncedCart = await syncCartItemsWithProducts(cart)
	return serializeCart(syncedCart)
}

const addItemToCart = async (userId, { productId, quantity = 1 }) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new CartServiceError('userId is invalid', 400)
	}

	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new CartServiceError('productId is invalid', 400)
	}

	const normalizedQuantity = Math.max(1, Number(quantity) || 1)

	const product = await Product.findOne({ _id: productId, isActive: { $ne: false } })

	if (!product) {
		throw new CartServiceError('Product not found', 404)
	}

	const unitPrice = parsePriceNumber(product.price)
	const cart = await ensureCart(userId)

	const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId))

	if (itemIndex >= 0) {
		cart.items[itemIndex].quantity += normalizedQuantity
		cart.items[itemIndex].unitPrice = unitPrice
		cart.items[itemIndex].productName = product.productName
		cart.items[itemIndex].productImage = extractFirstImage(product.images)
		cart.items[itemIndex].medicineCode = product.medicineCode || ''
	} else {
		cart.items.push({
			productId: product._id,
			medicineCode: product.medicineCode || '',
			productName: product.productName,
			productImage: extractFirstImage(product.images),
			unitPrice,
			quantity: normalizedQuantity,
		})
	}

	await cart.save()
	return serializeCart(cart)
}

const updateCartItemQuantity = async (userId, productId, quantity) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new CartServiceError('userId is invalid', 400)
	}

	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new CartServiceError('productId is invalid', 400)
	}

	const cart = await ensureCart(userId)
	const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId))

	if (itemIndex < 0) {
		throw new CartServiceError('Cart item not found', 404)
	}

	const normalizedQuantity = Number(quantity)

	if (!Number.isFinite(normalizedQuantity)) {
		throw new CartServiceError('quantity is invalid', 400)
	}

	if (normalizedQuantity <= 0) {
		cart.items.splice(itemIndex, 1)
	} else {
		cart.items[itemIndex].quantity = Math.max(1, Math.floor(normalizedQuantity))
	}

	await cart.save()
	return serializeCart(cart)
}

const removeCartItem = async (userId, productId) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new CartServiceError('userId is invalid', 400)
	}

	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new CartServiceError('productId is invalid', 400)
	}

	const cart = await ensureCart(userId)
	const nextItems = cart.items.filter((item) => String(item.productId) !== String(productId))

	if (nextItems.length === cart.items.length) {
		throw new CartServiceError('Cart item not found', 404)
	}

	cart.items = nextItems
	await cart.save()

	return serializeCart(cart)
}

const clearCart = async (userId) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new CartServiceError('userId is invalid', 400)
	}

	const cart = await ensureCart(userId)
	cart.items = []
	await cart.save()

	return serializeCart(cart)
}

module.exports = {
	CartServiceError,
	getCartByUserId,
	addItemToCart,
	updateCartItemQuantity,
	removeCartItem,
	clearCart,
}
