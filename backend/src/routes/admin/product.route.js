const express = require('express')

const productController = require('../../controllers/admin/product.controller')
const { validate } = require('../../middleware/validate')
const {
	createProductSchema,
	updateProductSchema,
	addInventoryBatchSchema,
	productQuerySchema,
} = require('../../validations/product.validation')

const router = express.Router()

// GET /api/admin/products — Danh sách sản phẩm (có pagination, search, filter)
router.get('/', validate(productQuerySchema, 'query'), productController.listProducts)

// GET /api/admin/products/:productId — Chi tiết sản phẩm
router.get('/:productId', productController.getProductDetail)

// POST /api/admin/products — Tạo sản phẩm mới
router.post('/', validate(createProductSchema), productController.createProduct)

// PATCH /api/admin/products/:productId — Cập nhật sản phẩm
router.patch('/:productId', validate(updateProductSchema), productController.updateProduct)

// PUT /api/admin/products/:id — Cập nhật sản phẩm (compat cho luồng form mới)
router.put('/:id', validate(updateProductSchema), productController.updateProduct)

// DELETE /api/admin/products/:productId — Xóa sản phẩm (soft delete)
router.delete('/:productId', productController.deleteProduct)

// POST /api/admin/products/:productId/inventory — Thêm lô hàng
router.post('/:productId/inventory', validate(addInventoryBatchSchema), productController.addInventoryBatch)

module.exports = router
