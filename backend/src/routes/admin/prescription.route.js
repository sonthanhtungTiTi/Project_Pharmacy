const express = require('express')
const router = express.Router()
const prescriptionController = require('../../controllers/admin/prescription.controller')

// Auth middleware đã được apply toàn bộ ở admin/index.js
router.get('/', prescriptionController.getRequests)
router.post('/:id/approve', prescriptionController.approveRequest)
router.post('/:id/reject', prescriptionController.rejectRequest)

module.exports = router
