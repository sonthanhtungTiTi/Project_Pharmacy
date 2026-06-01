const mongoose = require('mongoose')
const axios = require('axios')

const Product = require('../../models/product.model')

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

const extractTextFromImage = async (imageBuffer) => {
	const geminiApiKey = process.env.GEMINI_API_KEY
	
	if (!geminiApiKey) {
		console.warn('GEMINI_API_KEY is not set in environment variables')
		return ""
	}

	try {
		const base64Data = imageBuffer.toString('base64')
		const response = await axios.post(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
			{
				contents: [
					{
						parts: [
							{
								text: "Identify the medicines or symptoms written in this image. Output ONLY a comma-separated list of the extracted Vietnamese phrases (e.g. 'Paracetamol, đau đầu, sổ mũi'). Do not add any other text or formatting. If there are no medicines or symptoms, output nothing."
							},
							{
								inline_data: {
									mime_type: "image/jpeg",
									data: base64Data
								}
							}
						]
					}
				],
				generationConfig: {
					temperature: 0.1,
					topK: 1,
					topP: 1
				}
			},
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		)

		if (response.data && response.data.candidates && response.data.candidates.length > 0) {
			const candidate = response.data.candidates[0]
			if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
				return String(candidate.content.parts[0].text || '').trim()
			}
		}
		return ""
	} catch (error) {
		console.error("Gemini OCR Error:", error?.response?.data || error.message)
		return ""
	}
}

const searchProductsByImage = async (imageBuffer) => {
	try {
		const extractedText = await extractTextFromImage(imageBuffer)
		
		// Tiền xử lý text: Tách theo dấu phẩy để lấy chính xác các cụm từ/tên thuốc
		// thay vì tách theo từng khoảng trắng gây nhiễu
		const phrases = extractedText.split(',').map(s => s.trim()).filter(s => s.length > 2)
		
		if (phrases.length === 0) {
			return { items: [], extractedText }
		}
		
		// Tạo mảng regex để tìm kiếm chính xác cụm từ (có thể bỏ chữ hoa chữ thường)
		const regexArray = phrases.map(kw => new RegExp(escapeRegex(kw), 'i'))
		
		// Tìm các sản phẩm khớp với bất kỳ cụm từ nào
		const products = await Product.find({
			isActive: { $ne: false },
			$or: [
				{ productName: { $in: regexArray } },
				{ activeIngredient: { $in: regexArray } },
				{ mainIngredients: { $in: regexArray } }
			]
		})
		.select('_id medicineCode productName categoryId categoryName images isActive sellUnits defaultSellUnit totalBaseQuantity price requiresPrescription')
		.limit(10)
		.lean()
		
		return {
			items: products.map(toProductCard),
			extractedText
		}
	} catch (error) {
		console.error("OCR Error:", error)
		throw new ProductServiceError('Lỗi xử lý hình ảnh', 500)
	}
}

module.exports = {
	getProducts,
	getProductDetail,
	findProductByKeyword,
	searchProductsByKeyword,
	searchProductsByImage,
}
