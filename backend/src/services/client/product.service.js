const mongoose = require('mongoose')

const Product = require('../../models/product.model')

class ProductServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toProductCard = (product) => ({
	id: product._id,
	medicineCode: product.medicineCode,
	productName: product.productName,
	price: product.price,
	categoryId: product.categoryId,
	categoryName: product.categoryName,
	images: product.images || '',
	isActive: Boolean(product.isActive),
})

const toAiSearchItem = (product) => {
	const totalStock = Array.isArray(product.inventory)
		? product.inventory.reduce((sum, batch) => sum + Number(batch.quantity || 0), 0)
		: 0

	return {
		id: String(product._id),
		name: product.productName || product.medicineName || '',
		price: Number(product.price || 0),
		shortDescription: String(product.usageSummary || product.description || '').trim(),
		image: String(product.images || '').trim(),
		totalStock,
	}
}

const findProductByKeyword = async (keyword, { limit = 5 } = {}) => {
	const normalizedKeyword = String(keyword || '').trim()
	if (!normalizedKeyword) {
		return []
	}

	const safeLimit = Math.min(10, Math.max(1, Number(limit) || 5))
	const regex = new RegExp(escapeRegex(normalizedKeyword), 'i')

	const docs = await Product.find({
		isActive: { $ne: false },
		$or: [
			{ productName: regex },
			{ medicineName: regex },
			{ medicineCode: regex },
			{ categoryName: regex },
			{ usageSummary: regex },
			{ description: regex },
			{ activeIngredient: regex },
			{ additionalInfo: regex },
		],
	})
		.select('_id productName medicineName price usageSummary description images inventory')
		.sort({ updatedAt: -1 })
		.limit(safeLimit)
		.lean()

	return docs.map(toAiSearchItem)
}

const searchProductsByKeyword = async ({ q, keyword, limit = 5 } = {}) => {
	const resolvedKeyword = String(q || keyword || '').trim()
	const safeLimit = Math.min(10, Math.max(1, Number(limit) || 5))

	if (!resolvedKeyword) {
		return {
			keyword: '',
			items: [],
			meta: {
				limit: safeLimit,
				count: 0,
			},
		}
	}

	const items = await findProductByKeyword(resolvedKeyword, { limit: safeLimit })

	return {
		keyword: resolvedKeyword,
		items,
		meta: {
			limit: safeLimit,
			count: items.length,
		},
	}
}

const getProducts = async ({ categoryId, search, page = 1, limit = 20 }) => {
	// Check if limit is 0 or "all" - if so, fetch all products
	const isGetAll = limit === 0 || limit === '0' || String(limit).toLowerCase() === 'all'
	
	const numericPage = Math.max(1, Number(page) || 1)
	const numericLimit = isGetAll ? 0 : Math.min(100, Math.max(1, Number(limit) || 20))
	const skip = isGetAll ? 0 : (numericPage - 1) * numericLimit

	const filter = { isActive: { $ne: false } }
	const andConditions = []

	if (categoryId) {
		const normalizedCategoryId = String(categoryId).trim()

		if (!normalizedCategoryId) {
			throw new ProductServiceError('categoryId is invalid', 400)
		}

		if (mongoose.Types.ObjectId.isValid(normalizedCategoryId)) {
			andConditions.push({
				$or: [
					{ categoryId: normalizedCategoryId },
					{ categoryId: new mongoose.Types.ObjectId(normalizedCategoryId) },
				],
			})
		} else {
			andConditions.push({ categoryId: normalizedCategoryId })
		}
	}

	if (search) {
		const keyword = String(search).trim()
		if (keyword) {
			andConditions.push({
				$or: [
					{ productName: { $regex: keyword, $options: 'i' } },
					{ medicineName: { $regex: keyword, $options: 'i' } },
					{ description: { $regex: keyword, $options: 'i' } },
					{ usageSummary: { $regex: keyword, $options: 'i' } },
					{ additionalInfo: { $regex: keyword, $options: 'i' } },
				],
			})
		}
	}

	if (andConditions.length > 0) {
		filter.$and = andConditions
	}

	const [items, total] = await Promise.all([
		isGetAll
			? Product.find(filter)
					.select('_id medicineCode productName price categoryId categoryName images isActive')
					.sort({ createdAt: -1 })
			: Product.find(filter)
					.select('_id medicineCode productName price categoryId categoryName images isActive')
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(numericLimit),
		Product.countDocuments(filter),
	])

	return {
		items: items.map(toProductCard),
		pagination: {
			page: isGetAll ? 1 : numericPage,
			limit: isGetAll ? total : numericLimit,
			total,
			totalPages: isGetAll ? 1 : Math.max(1, Math.ceil(total / numericLimit)),
		},
	}
}

const getProductDetail = async (productId) => {
	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new ProductServiceError('productId is invalid', 400)
	}

	const product = await Product.findOne({ _id: productId, isActive: { $ne: false } })

	if (!product) {
		throw new ProductServiceError('Product not found', 404)
	}

	return product
}

module.exports = {
	getProducts,
	getProductDetail,
	findProductByKeyword,
	searchProductsByKeyword,
}
