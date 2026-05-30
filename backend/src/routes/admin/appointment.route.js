const express = require('express')
const { authenticateClientJwt, authorizeAdmin } = require('../../middleware/auth.middleware')
const appointmentController = require('../../controllers/admin/appointment.controller')

const { validate } = require('../../middleware/validate')
const { updateAppointmentStatusSchema } = require('../../validations/extra.validation')

const router = express.Router()

router.use(authenticateClientJwt, authorizeAdmin)

router.get('/', appointmentController.getAppointments)
router.patch('/:id/status', validate(updateAppointmentStatusSchema), appointmentController.updateAppointmentStatus)

module.exports = router
