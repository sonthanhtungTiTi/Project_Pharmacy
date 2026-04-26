const Category = require('../../models/category.model')

const getCategories = async () => {
	const categories = await Category.find({})
		.sort({ categoryName: 1, createdAt: 1 })
		.lean()

	return categories.map((item) => ({
		_id: item._id,
		categoryName: item.categoryName,
		parentId: item.parentId ?? null,
		isActive: item.isActive !== false,
	}))
}

module.exports = {
	getCategories,
}
