const express = require('express')

const categoryController = require('../../controllers/admin/category.controller')
const { authorize } = require('../../middleware/authorize.middleware')
const { validate } = require('../../middleware/validate')
const { ROLE_GROUPS } = require('../../constants/roles')
const { createCategorySchema, updateCategorySchema } = require('../../validations/category.validation')

const router = express.Router()

// GET /api/admin/categories — Danh sách categories
router.get('/', categoryController.listCategories)

// GET /api/admin/categories/:categoryId — Chi tiết
router.get('/:categoryId', categoryController.getCategoryDetail)

// POST /api/admin/categories — Tạo mới (chỉ admin)
router.post('/',
	authorize(ROLE_GROUPS.ADMIN_ONLY),
	validate(createCategorySchema),
	categoryController.createCategory,
)

// PATCH /api/admin/categories/:categoryId — Cập nhật (chỉ admin)
router.patch('/:categoryId',
	authorize(ROLE_GROUPS.ADMIN_ONLY),
	validate(updateCategorySchema),
	categoryController.updateCategory,
)

// DELETE /api/admin/categories/:categoryId — Xóa (chỉ admin)
router.delete('/:categoryId',
	authorize(ROLE_GROUPS.ADMIN_ONLY),
	categoryController.deleteCategory,
)

module.exports = router
