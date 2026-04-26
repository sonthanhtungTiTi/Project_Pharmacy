const express = require('express')

const addressController = require('../../controllers/client/address.controller')
const { authenticateClientJwt } = require('../../middleware/auth.middleware')

const router = express.Router()

router.use(authenticateClientJwt)

router.get('/', addressController.getMyAddresses)
router.get('/default', addressController.getMyDefaultAddress)
router.post('/', addressController.createMyAddress)
router.patch('/:addressId', addressController.updateMyAddress)
router.patch('/:addressId/default', addressController.setMyDefaultAddress)
router.delete('/:addressId', addressController.deleteMyAddress)

module.exports = router
