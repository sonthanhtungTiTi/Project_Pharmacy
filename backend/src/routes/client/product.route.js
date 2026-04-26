const express = require('express')

const productController = require('../../controllers/client/product.controller')

const router = express.Router()

router.get('/', productController.listProducts)
router.get('/search', productController.searchProducts)
router.get('/:productId', productController.getProductDetail)

module.exports = router
