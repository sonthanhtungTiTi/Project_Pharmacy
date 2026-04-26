const express = require('express')
const router = express.Router()

const consultationController = require('../../controllers/admin/consultation.controller')
const { authenticateClientJwt, authorizeAdmin, authorizeStaff } = require('../../middleware/auth.middleware')

// Tất cả routes cần authentication
router.use(authenticateClientJwt)

// [Admin] GET: Danh sách tất cả consultations
router.get('/', authorizeAdmin, consultationController.getAllConsultations)

// [Admin] GET: Thống kê consultations
router.get('/stats/dashboard', authorizeAdmin, consultationController.getConsultationStats)

// [Admin] GET: Danh sách consultations sắp tới
router.get('/upcoming/list', authorizeAdmin, consultationController.getUpcomingConsultations)

// [Staff] GET: Danh sách consultations được gán cho staff
router.get('/staff/my-consultations', authorizeStaff, consultationController.getStaffConsultations)

// [Admin] PATCH: Cập nhật trạng thái
router.patch('/:consultationId/status', authorizeAdmin, consultationController.updateConsultationStatus)

// [Admin] PATCH: Gán nhân viên tư vấn
router.patch('/:consultationId/assign-staff', authorizeAdmin, consultationController.assignStaffToConsultation)

// [Staff] PATCH: Cập nhật ghi chú của staff
router.patch('/:consultationId/staff-note', authorizeStaff, consultationController.updateStaffNote)

module.exports = router
