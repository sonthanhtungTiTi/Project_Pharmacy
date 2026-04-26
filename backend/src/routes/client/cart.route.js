const express = require('express')

const cartController = require('../../controllers/client/cart.controller')
const { authenticateClientJwt } = require('../../middleware/auth.middleware')

const router = express.Router()

router.use(authenticateClientJwt)

router.get('/', cartController.getCart)
router.post('/items', cartController.addCartItem)
router.patch('/items/:productId', cartController.updateCartItem)
router.delete('/items/:productId', cartController.deleteCartItem)
router.delete('/clear', cartController.clearCart)

module.exports = router
