const mongoose = require('mongoose')

const Product = require('../../models/product.model')

class InventoryServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

/**
 * Danh sách tồn kho — tất cả sản phẩm + tổng stock
 */
const listInventory = async ({ page = 1, limit = 20, search, stockStatus } = {}) => {
	const numericPage = Math.max(1, Number(page) || 1)
	const numericLimit = Math.min(100, Math.max(1, Number(limit) || 20))
	const skip = (numericPage - 1) * numericLimit

	const filter = { isActive: { $ne: false } }

	if (search) {
		const keyword = String(search).trim()
		if (keyword) {
			const regex = { $regex: keyword, $options: 'i' }
			filter.$or = [
				{ productName: regex },
				{ medicineCode: regex },
			]
		}
	}

	const [products, total] = await Promise.all([
		Product.find(filter)
			.select('_id medicineCode productName price images inventory categoryName unit')
			.sort({ productName: 1 })
			.skip(skip)
			.limit(numericLimit)
			.lean(),
		Product.countDocuments(filter),
	])

	let items = products.map((p) => {
		const batches = p.inventory || []
		const totalStock = batches.reduce((sum, b) => sum + (b.quantity || 0), 0)
		const nearestExpiry = batches
			.filter((b) => b.expiryDate)
			.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0]

		return {
			id: String(p._id),
			medicineCode: p.medicineCode,
			productName: p.productName,
			categoryName: p.categoryName || '',
			price: p.price,
			unit: p.unit || '',
			images: p.images || '',
			totalStock,
			batchCount: batches.length,
			nearestExpiry: nearestExpiry ? {
				batchNumber: nearestExpiry.batchNumber,
				expiryDate: nearestExpiry.expiryDate,
				quantity: nearestExpiry.quantity,
				daysLeft: Math.ceil((new Date(nearestExpiry.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
			} : null,
		}
	})

	// Filter theo stock status
	if (stockStatus === 'low') {
		items = items.filter((p) => p.totalStock > 0 && p.totalStock <= 10)
	} else if (stockStatus === 'out') {
		items = items.filter((p) => p.totalStock === 0)
	} else if (stockStatus === 'normal') {
		items = items.filter((p) => p.totalStock > 10)
	}

	return {
		items,
		pagination: {
			page: numericPage,
			limit: numericLimit,
			total,
			totalPages: Math.max(1, Math.ceil(total / numericLimit)),
		},
	}
}

/**
 * Chi tiết kho cho 1 sản phẩm
 */
const getProductInventory = async (productId) => {
	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new InventoryServiceError('productId không hợp lệ', 400)
	}

	const product = await Product.findById(productId)
		.select('_id medicineCode productName inventory price unit')
		.lean()

	if (!product) {
		throw new InventoryServiceError('Sản phẩm không tồn tại', 404)
	}

	const batches = (product.inventory || []).map((b) => ({
		batchNumber: b.batchNumber,
		quantity: b.quantity,
		expiryDate: b.expiryDate,
		importPrice: b.importPrice,
		daysUntilExpiry: Math.ceil((new Date(b.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
		isExpired: new Date(b.expiryDate) < new Date(),
	}))

	const totalStock = batches.reduce((sum, b) => sum + (b.quantity || 0), 0)
	const totalValue = batches.reduce((sum, b) => sum + (b.quantity || 0) * (b.importPrice || 0), 0)

	return {
		id: String(product._id),
		medicineCode: product.medicineCode,
		productName: product.productName,
		price: product.price,
		unit: product.unit || '',
		totalStock,
		totalValue,
		batches,
	}
}

/**
 * Nhập lô hàng mới
 */
const importBatch = async (productId, batchData) => {
	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new InventoryServiceError('productId không hợp lệ', 400)
	}

	const product = await Product.findById(productId)
	if (!product) {
		throw new InventoryServiceError('Sản phẩm không tồn tại', 404)
	}

	// Kiểm tra batch trùng
	const existingBatch = product.inventory.find(
		(b) => b.batchNumber === batchData.batchNumber,
	)
	if (existingBatch) {
		throw new InventoryServiceError('Số lô đã tồn tại cho sản phẩm này', 409)
	}

	product.inventory.push({
		batchNumber: batchData.batchNumber,
		quantity: batchData.quantity,
		expiryDate: batchData.expiryDate,
		importPrice: batchData.importPrice,
	})

	await product.save()

	return getProductInventory(productId)
}

/**
 * Điều chỉnh số lượng batch
 */
const adjustBatchQuantity = async (productId, batchNumber, { quantity, reason } = {}) => {
	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new InventoryServiceError('productId không hợp lệ', 400)
	}

	if (quantity === undefined || quantity === null) {
		throw new InventoryServiceError('Số lượng mới là bắt buộc', 400)
	}

	const product = await Product.findById(productId)
	if (!product) {
		throw new InventoryServiceError('Sản phẩm không tồn tại', 404)
	}

	const batch = product.inventory.find((b) => b.batchNumber === batchNumber)
	if (!batch) {
		throw new InventoryServiceError('Số lô không tồn tại', 404)
	}

	batch.quantity = Math.max(0, Number(quantity))
	await product.save()

	return getProductInventory(productId)
}

/**
 * Xóa batch khỏi sản phẩm
 */
const removeBatch = async (productId, batchNumber) => {
	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new InventoryServiceError('productId không hợp lệ', 400)
	}

	const product = await Product.findById(productId)
	if (!product) {
		throw new InventoryServiceError('Sản phẩm không tồn tại', 404)
	}

	const batchIndex = product.inventory.findIndex((b) => b.batchNumber === batchNumber)
	if (batchIndex === -1) {
		throw new InventoryServiceError('Số lô không tồn tại', 404)
	}

	product.inventory.splice(batchIndex, 1)
	await product.save()

	return getProductInventory(productId)
}

/**
 * Sản phẩm sắp hết hạn
 */
const getExpiringBatches = async ({ daysUntilExpiry = 90 } = {}) => {
	const numDays = Math.max(1, Number(daysUntilExpiry) || 90)
	const thresholdDate = new Date()
	thresholdDate.setDate(thresholdDate.getDate() + numDays)

	const products = await Product.find({
		isActive: { $ne: false },
		'inventory.expiryDate': { $lte: thresholdDate },
	})
		.select('_id medicineCode productName inventory')
		.lean()

	const result = []
	for (const p of products) {
		const expiringBatches = (p.inventory || [])
			.filter((b) => new Date(b.expiryDate) <= thresholdDate)
			.map((b) => ({
				batchNumber: b.batchNumber,
				quantity: b.quantity,
				expiryDate: b.expiryDate,
				importPrice: b.importPrice,
				daysLeft: Math.ceil((new Date(b.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
				isExpired: new Date(b.expiryDate) < new Date(),
			}))

		if (expiringBatches.length > 0) {
			result.push({
				id: String(p._id),
				medicineCode: p.medicineCode,
				productName: p.productName,
				expiringBatches,
			})
		}
	}

	return result.sort((a, b) => {
		const aMin = Math.min(...a.expiringBatches.map((b) => b.daysLeft))
		const bMin = Math.min(...b.expiringBatches.map((b) => b.daysLeft))
		return aMin - bMin
	})
}

/**
 * Tổng quan kho
 */
const getInventoryOverview = async () => {
	const products = await Product.find({ isActive: { $ne: false } })
		.select('inventory price')
		.lean()

	let totalProducts = products.length
	let totalBatches = 0
	let totalStock = 0
	let totalValue = 0
	let outOfStock = 0
	let lowStock = 0
	let expiredBatches = 0
	let expiringSoon = 0

	const now = new Date()
	const expiryThreshold = new Date()
	expiryThreshold.setDate(expiryThreshold.getDate() + 90)

	for (const p of products) {
		const batches = p.inventory || []
		const productStock = batches.reduce((sum, b) => sum + (b.quantity || 0), 0)

		totalBatches += batches.length
		totalStock += productStock
		totalValue += batches.reduce((sum, b) => sum + (b.quantity || 0) * (b.importPrice || 0), 0)

		if (productStock === 0) outOfStock++
		else if (productStock <= 10) lowStock++

		for (const b of batches) {
			if (new Date(b.expiryDate) < now) expiredBatches++
			else if (new Date(b.expiryDate) <= expiryThreshold) expiringSoon++
		}
	}

	return {
		totalProducts,
		totalBatches,
		totalStock,
		totalValue,
		outOfStock,
		lowStock,
		expiredBatches,
		expiringSoon,
	}
}

module.exports = {
	InventoryServiceError,
	listInventory,
	getProductInventory,
	importBatch,
	adjustBatchQuantity,
	removeBatch,
	getExpiringBatches,
	getInventoryOverview,
}
