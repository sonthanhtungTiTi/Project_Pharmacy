const express = require('express')

const productController = require('../../controllers/client/product.controller')

const router = express.Router()

const multer = require('multer')

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
})

router.get('/', productController.listProducts)
router.get('/search', productController.searchProducts)
router.post('/search-image', upload.single('image'), productController.searchProductsByImage)
router.get('/:productId', productController.getProductDetail)

module.exports = router
