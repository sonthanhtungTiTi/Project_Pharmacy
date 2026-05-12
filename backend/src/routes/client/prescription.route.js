const express = require('express')
const router = express.Router()
const prescriptionController = require('../../controllers/client/prescription.controller')
const { authenticateClientJwt } = require('../../middleware/auth.middleware')

router.post('/', authenticateClientJwt, prescriptionController.createRequest)
router.get('/my-requests', authenticateClientJwt, prescriptionController.getMyRequests)

module.exports = router
