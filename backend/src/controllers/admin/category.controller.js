const categoryService = require('../../services/admin/category.service')

const listCategories = async (req, res) => {
	try {
		const data = await categoryService.listCategories(req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Categories fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch categories failed',
		})
	}
}

const getCategoryDetail = async (req, res) => {
	try {
		const { categoryId } = req.params
		const data = await categoryService.getCategoryDetail(categoryId)

		return res.status(200).json({
			success: true,
			message: 'Category fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch category failed',
		})
	}
}

const createCategory = async (req, res) => {
	try {
		const data = await categoryService.createCategory(req.body)

		return res.status(201).json({
			success: true,
			message: 'Tạo danh mục thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Create category failed',
		})
	}
}

const updateCategory = async (req, res) => {
	try {
		const { categoryId } = req.params
		const data = await categoryService.updateCategory(categoryId, req.body)

		return res.status(200).json({
			success: true,
			message: 'Cập nhật danh mục thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Update category failed',
		})
	}
}

const deleteCategory = async (req, res) => {
	try {
		const { categoryId } = req.params
		const data = await categoryService.deleteCategory(categoryId)

		return res.status(200).json({
			success: true,
			message: 'Xóa danh mục thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Delete category failed',
		})
	}
}

module.exports = {
	listCategories,
	getCategoryDetail,
	createCategory,
	updateCategory,
	deleteCategory,
}
