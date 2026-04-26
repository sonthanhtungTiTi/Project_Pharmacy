const categoryService = require('../../services/client/category.service')

const listCategories = async (req, res) => {
	try {
		const data = await categoryService.getCategories()

		return res.status(200).json({
			success: true,
			message: 'Categories fetched successfully',
			data,
		})
	} catch (error) {
		const statusCode = error.statusCode || 500

		return res.status(statusCode).json({
			success: false,
			message: error.message || 'Fetch categories failed',
			error: error.message,
		})
	}
}

module.exports = {
	listCategories,
}
