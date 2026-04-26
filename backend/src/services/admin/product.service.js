const mongoose = require('mongoose')

const Product = require('../../models/product.model')
const Category = require('../../models/category.model')

class AdminProductServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

/**
 * Serialize product cho admin (trả về đầy đủ thông tin)
 */
const serializeProduct = (doc) => ({
	id: String(doc._id),
	medicineCode: doc.medicineCode,
	productName: doc.productName,
	medicineName: doc.medicineName || '',
	price: doc.price,
	categoryId: doc.categoryId,
	categoryName: doc.categoryName,
	brand: doc.brand || '',
	manufacturer: doc.manufacturer || '',
	images: doc.images || '',
	unit: doc.unit || '',
	dosage: doc.dosage || '',
	usageSummary: doc.usageSummary || '',
	mainIngredients: doc.mainIngredients || '',
	activeIngredient: doc.activeIngredient || '',
	targetUsers: doc.targetUsers || '',
	ingredients: doc.ingredients || '',
	usage: doc.usage || '',
	contraindications: doc.contraindications || '',
	sideEffects: doc.sideEffects || '',
	precautions: doc.precautions || '',
	pharmacology: doc.pharmacology || '',
	additionalInfo: doc.additionalInfo || '',
	storage: doc.storage || '',
	packaging: doc.packaging || '',
	expiry: doc.expiry || '',
	manufacturerDetail: doc.manufacturerDetail || '',
	characteristics: doc.characteristics || '',
	description: doc.description || '',
	requiresPrescription: Boolean(doc.requiresPrescription),
	isActive: doc.isActive !== false,
	inventory: (doc.inventory || []).map((batch) => ({
		batchNumber: batch.batchNumber,
		quantity: batch.quantity,
		expiryDate: batch.expiryDate,
		importPrice: batch.importPrice,
	})),
	totalStock: (doc.inventory || []).reduce((sum, b) => sum + (b.quantity || 0), 0),
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
})

/**
 * Danh sách sản phẩm (admin) — với pagination, search, filter
 */
const listProducts = async ({ page = 1, limit = 20, search, categoryId, status = 'all', sortBy = 'newest', priceMin, priceMax } = {}) => {
	const numericPage = Math.max(1, Number(page) || 1)
	const numericLimit = Math.min(100, Math.max(1, Number(limit) || 20))
	const skip = (numericPage - 1) * numericLimit

	const filter = {}

	// Filter theo status
	if (status === 'active') {
		filter.isActive = { $ne: false }
	} else if (status === 'inactive') {
		filter.isActive = false
	}
	// 'all' => không filter isActive

	// Filter theo category
	if (categoryId) {
		const normalized = String(categoryId).trim()
		if (mongoose.Types.ObjectId.isValid(normalized)) {
			filter.$or = [
				{ categoryId: normalized },
				{ categoryId: new mongoose.Types.ObjectId(normalized) },
			]
		} else {
			filter.categoryId = normalized
		}
	}

	// Filter theo giá
	if (priceMin !== undefined || priceMax !== undefined) {
		filter.price = {}
		if (priceMin !== undefined) filter.price.$gte = Number(priceMin)
		if (priceMax !== undefined) filter.price.$lte = Number(priceMax)
	}

	// Search theo tên, mã thuốc
	if (search) {
		const keyword = String(search).trim()
		if (keyword) {
			const regex = { $regex: keyword, $options: 'i' }
			// Nếu đã có $or (từ categoryId), dùng $and
			const searchCondition = {
				$or: [
					{ productName: regex },
					{ medicineName: regex },
					{ medicineCode: regex },
					{ mainIngredients: regex },
					{ brand: regex },
				],
			}
			if (filter.$or) {
				const categoryCondition = { $or: filter.$or }
				delete filter.$or
				filter.$and = [categoryCondition, searchCondition]
			} else {
				Object.assign(filter, searchCondition)
			}
		}
	}

	// Sort
	let sort = { createdAt: -1 }
	if (sortBy === 'price_asc') sort = { price: 1 }
	else if (sortBy === 'price_desc') sort = { price: -1 }
	else if (sortBy === 'name') sort = { productName: 1 }

	const [items, total] = await Promise.all([
		Product.find(filter).sort(sort).skip(skip).limit(numericLimit),
		Product.countDocuments(filter),
	])

	return {
		items: items.map(serializeProduct),
		pagination: {
			page: numericPage,
			limit: numericLimit,
			total,
			totalPages: Math.max(1, Math.ceil(total / numericLimit)),
		},
	}
}

/**
 * Chi tiết sản phẩm
 */
const getProductDetail = async (productId) => {
	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new AdminProductServiceError('productId không hợp lệ', 400)
	}

	const product = await Product.findById(productId)
	if (!product) {
		throw new AdminProductServiceError('Sản phẩm không tồn tại', 404)
	}

	return serializeProduct(product)
}

/**
 * Tạo sản phẩm mới
 */
const createProduct = async (data) => {
	// Kiểm tra mã thuốc trùng
	const existingCode = await Product.findOne({ medicineCode: data.medicineCode })
	if (existingCode) {
		throw new AdminProductServiceError('Mã thuốc đã tồn tại', 409)
	}

	// Validate categoryId nếu có
	if (data.categoryId && mongoose.Types.ObjectId.isValid(data.categoryId)) {
		const category = await Category.findById(data.categoryId)
		if (category) {
			data.categoryName = data.categoryName || category.categoryName
		}
	}

	const product = new Product(data)
	await product.save()

	return serializeProduct(product)
}

/**
 * Cập nhật sản phẩm
 */
const updateProduct = async (productId, data) => {
	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new AdminProductServiceError('productId không hợp lệ', 400)
	}

	// Nếu đổi medicineCode, check trùng
	if (data.medicineCode) {
		const existing = await Product.findOne({
			medicineCode: data.medicineCode,
			_id: { $ne: productId },
		})
		if (existing) {
			throw new AdminProductServiceError('Mã thuốc đã tồn tại', 409)
		}
	}

	const product = await Product.findByIdAndUpdate(
		productId,
		data,
		{ new: true, runValidators: true },
	)

	if (!product) {
		throw new AdminProductServiceError('Sản phẩm không tồn tại', 404)
	}

	return serializeProduct(product)
}

/**
 * Xóa sản phẩm (soft delete — set isActive = false)
 */
const deleteProduct = async (productId) => {
	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new AdminProductServiceError('productId không hợp lệ', 400)
	}

	const product = await Product.findByIdAndUpdate(
		productId,
		{ $set: { isActive: false } },
		{ new: true },
	)

	if (!product) {
		throw new AdminProductServiceError('Sản phẩm không tồn tại', 404)
	}

	return { id: String(product._id), message: 'Sản phẩm đã được vô hiệu hóa' }
}

/**
 * Thêm lô hàng (inventory batch) vào sản phẩm
 */
const addInventoryBatch = async (productId, batchData) => {
	if (!mongoose.Types.ObjectId.isValid(productId)) {
		throw new AdminProductServiceError('productId không hợp lệ', 400)
	}

	const product = await Product.findById(productId)
	if (!product) {
		throw new AdminProductServiceError('Sản phẩm không tồn tại', 404)
	}

	// Kiểm tra batch trùng
	const existingBatch = product.inventory.find(
		(b) => b.batchNumber === batchData.batchNumber,
	)
	if (existingBatch) {
		throw new AdminProductServiceError('Số lô đã tồn tại cho sản phẩm này', 409)
	}

	product.inventory.push(batchData)
	await product.save()

	return serializeProduct(product)
}

module.exports = {
	AdminProductServiceError,
	listProducts,
	getProductDetail,
	createProduct,
	updateProduct,
	deleteProduct,
	addInventoryBatch,
}
