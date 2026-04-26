const express = require('express')
const consultationController = require('../../controllers/client/consultation.controller')
const { authenticateClientJwt } = require('../../middleware/auth.middleware')
const { validate } = require('../../middleware/validate')
const { createConsultationSchema } = require('../../validations/consultation.validation')

const router = express.Router()

// Tất cả routes yêu cầu authentication
router.use(authenticateClientJwt)

// POST: Tạo lịch tư vấn
router.post('/', validate(createConsultationSchema), consultationController.createConsultation)

// GET: Danh sách lịch tư vấn của user (có pagination, filter by status)
router.get('/', consultationController.getMyConsultations)

// GET: Chi tiết lịch tư vấn theo consultation code
router.get('/code/:consultationCode', consultationController.getConsultationByCode)

// GET: Chi tiết lịch tư vấn theo ID
router.get('/:consultationId', consultationController.getConsultationDetail)

// PATCH: Hủy lịch tư vấn
router.patch('/:consultationId/cancel', consultationController.cancelConsultation)

module.exports = router
