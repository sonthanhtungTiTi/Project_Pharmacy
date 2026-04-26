const express = require('express')

const inventoryController = require('../../controllers/admin/inventory.controller')
const { authorize } = require('../../middleware/authorize.middleware')
const { validate } = require('../../middleware/validate')
const { ROLE_GROUPS } = require('../../constants/roles')
const { addInventoryBatchSchema } = require('../../validations/product.validation')

const Joi = require('joi')

// Validation schemas cho inventory
const inventoryQuerySchema = Joi.object({
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(20),
	search: Joi.string().trim().max(200),
	stockStatus: Joi.string().valid('all', 'normal', 'low', 'out').default('all'),
})

const adjustQuantitySchema = Joi.object({
	quantity: Joi.number().integer().min(0).required(),
	reason: Joi.string().trim().max(500).allow(''),
})

const router = express.Router()

// Tất cả routes kho chỉ cho warehouse_staff, manager, admin
router.use(authorize(ROLE_GROUPS.INVENTORY_MANAGERS))

// GET /api/admin/inventory — Danh sách tồn kho
router.get('/', validate(inventoryQuerySchema, 'query'), inventoryController.listInventory)

// GET /api/admin/inventory/overview — Tổng quan kho
router.get('/overview', inventoryController.getInventoryOverview)

// GET /api/admin/inventory/expiring — Sản phẩm sắp hết hạn
router.get('/expiring', inventoryController.getExpiringBatches)

// GET /api/admin/inventory/:productId — Chi tiết kho sản phẩm
router.get('/:productId', inventoryController.getProductInventory)

// POST /api/admin/inventory/:productId/batch — Nhập lô hàng mới
router.post('/:productId/batch',
	validate(addInventoryBatchSchema),
	inventoryController.importBatch,
)

// PATCH /api/admin/inventory/:productId/batch/:batchNumber — Điều chỉnh số lượng
router.patch('/:productId/batch/:batchNumber',
	validate(adjustQuantitySchema),
	inventoryController.adjustBatchQuantity,
)

// DELETE /api/admin/inventory/:productId/batch/:batchNumber — Xóa lô
router.delete('/:productId/batch/:batchNumber',
	inventoryController.removeBatch,
)

module.exports = router
