const mongoose = require('mongoose')

const Category = require('../../models/category.model')

class AdminCategoryServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

const serializeCategory = (doc) => ({
	id: String(doc._id),
	categoryName: doc.categoryName,
	parentId: doc.parentId ? String(doc.parentId) : null,
	isActive: doc.isActive !== false,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
})

/**
 * Danh sách categories
 */
const listCategories = async ({ page = 1, limit = 50, search, status = 'all' } = {}) => {
	const numericPage = Math.max(1, Number(page) || 1)
	const numericLimit = Math.min(200, Math.max(1, Number(limit) || 50))
	const skip = (numericPage - 1) * numericLimit

	const filter = {}

	if (status === 'active') {
		filter.isActive = { $ne: false }
	} else if (status === 'inactive') {
		filter.isActive = false
	}

	if (search) {
		const keyword = String(search).trim()
		if (keyword) {
			filter.categoryName = { $regex: keyword, $options: 'i' }
		}
	}

	const [items, total] = await Promise.all([
		Category.find(filter)
			.sort({ categoryName: 1 })
			.skip(skip)
			.limit(numericLimit)
			.lean(),
		Category.countDocuments(filter),
	])

	return {
		items: items.map(serializeCategory),
		pagination: {
			page: numericPage,
			limit: numericLimit,
			total,
			totalPages: Math.max(1, Math.ceil(total / numericLimit)),
		},
	}
}

/**
 * Chi tiết category
 */
const getCategoryDetail = async (categoryId) => {
	if (!mongoose.Types.ObjectId.isValid(categoryId)) {
		throw new AdminCategoryServiceError('categoryId không hợp lệ', 400)
	}

	const category = await Category.findById(categoryId).lean()
	if (!category) {
		throw new AdminCategoryServiceError('Danh mục không tồn tại', 404)
	}

	return serializeCategory(category)
}

/**
 * Tạo category mới
 */
const createCategory = async (data) => {
	// Check tên trùng
	const existing = await Category.findOne({
		categoryName: { $regex: `^${data.categoryName.trim()}$`, $options: 'i' },
	})
	if (existing) {
		throw new AdminCategoryServiceError('Tên danh mục đã tồn tại', 409)
	}

	// Check parentId hợp lệ
	if (data.parentId) {
		if (!mongoose.Types.ObjectId.isValid(data.parentId)) {
			throw new AdminCategoryServiceError('parentId không hợp lệ', 400)
		}
		const parent = await Category.findById(data.parentId)
		if (!parent) {
			throw new AdminCategoryServiceError('Danh mục cha không tồn tại', 404)
		}
	}

	const category = new Category({
		categoryName: data.categoryName.trim(),
		parentId: data.parentId || null,
		isActive: data.isActive !== false,
	})

	await category.save()

	return serializeCategory(category)
}

/**
 * Cập nhật category
 */
const updateCategory = async (categoryId, data) => {
	if (!mongoose.Types.ObjectId.isValid(categoryId)) {
		throw new AdminCategoryServiceError('categoryId không hợp lệ', 400)
	}

	// Check tên trùng (nếu đổi tên)
	if (data.categoryName) {
		const existing = await Category.findOne({
			categoryName: { $regex: `^${data.categoryName.trim()}$`, $options: 'i' },
			_id: { $ne: categoryId },
		})
		if (existing) {
			throw new AdminCategoryServiceError('Tên danh mục đã tồn tại', 409)
		}
	}

	const category = await Category.findByIdAndUpdate(
		categoryId,
		{ $set: data },
		{ new: true, runValidators: true },
	)

	if (!category) {
		throw new AdminCategoryServiceError('Danh mục không tồn tại', 404)
	}

	return serializeCategory(category)
}

/**
 * Xóa category (soft delete)
 */
const deleteCategory = async (categoryId) => {
	if (!mongoose.Types.ObjectId.isValid(categoryId)) {
		throw new AdminCategoryServiceError('categoryId không hợp lệ', 400)
	}

	const category = await Category.findByIdAndUpdate(
		categoryId,
		{ $set: { isActive: false } },
		{ new: true },
	)

	if (!category) {
		throw new AdminCategoryServiceError('Danh mục không tồn tại', 404)
	}

	return { id: String(category._id), message: 'Danh mục đã được vô hiệu hóa' }
}

module.exports = {
	AdminCategoryServiceError,
	listCategories,
	getCategoryDetail,
	createCategory,
	updateCategory,
	deleteCategory,
}
