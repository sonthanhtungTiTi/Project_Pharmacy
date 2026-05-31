const mongoose = require('mongoose')

const Product = require('../../models/product.model')
const { analyzePrescriptionImage } = require('../ai/gemini.service')

class ProductServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toProductCard = (product) => {
	let price = 0
	if (product.sellUnits && product.defaultSellUnit) {
		const unitData = product.sellUnits instanceof Map 
			? product.sellUnits.get(product.defaultSellUnit)
			: product.sellUnits[product.defaultSellUnit]
		if (unitData) price = unitData.price
	} else if (product.price) {
		price = product.price
	}

	let firstImage = ''
	if (Array.isArray(product.images) && product.images.length > 0) {
		firstImage = product.images[0]
	} else if (typeof product.images === 'string') {
		firstImage = product.images
	}

	return {
		id: product._id,
		medicineCode: product.medicineCode,
		productName: product.productName,
		price: price,
		categoryId: product.categoryId,
		categoryName: product.categoryName,
		images: firstImage,
		isActive: Boolean(product.isActive),
		defaultSellUnit: product.defaultSellUnit || 'hộp',
		totalStock: product.totalBaseQuantity || 0,
		requiresPrescription: product.requiresPrescription || false,
	}
}

const toAiSearchItem = (product) => {
	const totalStock = product.totalBaseQuantity || (Array.isArray(product.inventory)
		? product.inventory.reduce((sum, batch) => sum + Number(batch.baseQuantity || batch.quantity || 0), 0)
		: 0)

	let price = 0
	if (product.sellUnits && product.defaultSellUnit) {
		const unitData = product.sellUnits instanceof Map 
			? product.sellUnits.get(product.defaultSellUnit)
			: product.sellUnits[product.defaultSellUnit]
		if (unitData) price = unitData.price
	} else if (product.price) {
		price = product.price
	}

	let firstImage = ''
	if (Array.isArray(product.images) && product.images.length > 0) {
		firstImage = product.images[0]
	} else if (typeof product.images === 'string') {
		firstImage = product.images
	}

	return {
		id: String(product._id),
		name: product.productName || product.medicineName || '',
		price: Number(price || 0),
		shortDescription: String(product.usageSummary || product.description || '').trim(),
		image: firstImage,
		totalStock,
		requiresPrescription: product.requiresPrescription || false,
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
		.select('_id productName medicineName usageSummary description images inventory sellUnits defaultSellUnit totalBaseQuantity price requiresPrescription')
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
					.select('_id medicineCode productName categoryId categoryName images isActive sellUnits defaultSellUnit totalBaseQuantity price requiresPrescription')
					.sort({ createdAt: -1 })
					.lean()
			: Product.find(filter)
					.select('_id medicineCode productName categoryId categoryName images isActive sellUnits defaultSellUnit totalBaseQuantity price requiresPrescription')
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(numericLimit)
					.lean(),
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

const searchProductsByImage = async (imageBuffer) => {
	try {
		const extractedMedicines = await analyzePrescriptionImage(imageBuffer)
		
		if (!extractedMedicines || extractedMedicines.length === 0) {
			return { items: [], extractedText: "Không nhận diện được loại thuốc nào từ hình ảnh." }
		}
		
		// Tạo mảng regex để tìm kiếm chính xác cụm từ (bỏ qua chữ hoa/thường)
		const regexArray = extractedMedicines.map(kw => new RegExp(escapeRegex(kw), 'i'))
		
		// Tìm các sản phẩm khớp với tên thuốc, hoạt chất
		const products = await Product.find({
			isActive: { $ne: false },
			$or: [
				{ productName: { $in: regexArray } },
				{ activeIngredient: { $in: regexArray } },
				{ mainIngredients: { $in: regexArray } }
			]
		})
		.select('_id medicineCode productName categoryId categoryName images isActive sellUnits defaultSellUnit totalBaseQuantity price requiresPrescription')
		.limit(20) // Trả về tối đa 20 kết quả để khách hàng chọn
		.lean()
		
		return {
			items: products.map(toProductCard),
			extractedText: extractedMedicines.join(', ')
		}
	} catch (error) {
		// Bắt lỗi đặc thù (mờ, viết tay) và đẩy lên Client
		if (error.code === 'ERR_BLURRY' || error.code === 'ERR_HANDWRITTEN') {
			throw new ProductServiceError(error.message, 400)
		}
		console.error("Search By Image Error:", error)
		throw new ProductServiceError(error.message || 'Lỗi xử lý hình ảnh', 500)
	}
}

module.exports = {
	getProducts,
	getProductDetail,
	findProductByKeyword,
	searchProductsByKeyword,
	searchProductsByImage,
}
