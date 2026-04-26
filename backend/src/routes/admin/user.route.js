const express = require('express')

const userController = require('../../controllers/admin/user.controller')
const { authorize } = require('../../middleware/authorize.middleware')
const { validate } = require('../../middleware/validate')
const { ROLE_GROUPS } = require('../../constants/roles')
const {
	userQuerySchema,
	createUserSchema,
	updateUserSchema,
	updateUserRoleSchema,
} = require('../../validations/user.validation')

const router = express.Router()

// GET /api/admin/users — Danh sách users (manager + admin)
router.get('/',
	authorize(ROLE_GROUPS.MANAGEMENT),
	validate(userQuerySchema, 'query'),
	userController.listUsers,
)

// GET /api/admin/users/stats — Thống kê users
router.get('/stats',
	authorize(ROLE_GROUPS.MANAGEMENT),
	userController.getUserStats,
)

// GET /api/admin/users/:userId — Chi tiết user
router.get('/:userId',
	authorize(ROLE_GROUPS.MANAGEMENT),
	userController.getUserDetail,
)

// POST /api/admin/users — Tạo user mới (chỉ admin)
router.post('/',
	authorize(ROLE_GROUPS.ADMIN_ONLY),
	validate(createUserSchema),
	userController.createUser,
)

// PATCH /api/admin/users/:userId — Cập nhật thông tin user
router.patch('/:userId',
	authorize(ROLE_GROUPS.MANAGEMENT),
	validate(updateUserSchema),
	userController.updateUser,
)

// PATCH /api/admin/users/:userId/role — Đổi role (chỉ admin)
router.patch('/:userId/role',
	authorize(ROLE_GROUPS.ADMIN_ONLY),
	validate(updateUserRoleSchema),
	userController.updateUserRole,
)

// PATCH /api/admin/users/:userId/ban — Ban user (chỉ admin)
router.patch('/:userId/ban',
	authorize(ROLE_GROUPS.ADMIN_ONLY),
	userController.banUser,
)

// PATCH /api/admin/users/:userId/unban — Unban user (chỉ admin)
router.patch('/:userId/unban',
	authorize(ROLE_GROUPS.ADMIN_ONLY),
	userController.unbanUser,
)

module.exports = router
