const express = require('express')

const orderController = require('../../controllers/client/order.controller')
const { authenticateClientJwt } = require('../../middleware/auth.middleware')
const { validate } = require('../../middleware/validate')
const { checkoutSchema } = require('../../validations/order.validation')

const router = express.Router()

router.use(authenticateClientJwt)

router.post('/', validate(checkoutSchema), orderController.checkoutFromCart)
router.post('/checkout', validate(checkoutSchema), orderController.checkoutFromCart)
router.get('/', orderController.getMyOrders)
router.get('/:orderId', orderController.getMyOrderDetail)
router.patch('/:orderId/cancel', orderController.cancelMyOrder)

module.exports = router
