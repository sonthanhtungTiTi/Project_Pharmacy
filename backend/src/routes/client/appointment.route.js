const express = require('express')
const { authenticateClientJwt } = require('../../middleware/auth.middleware')
const appointmentController = require('../../controllers/client/appointment.controller')

const router = express.Router()

const { validate } = require('../../middleware/validate')
const { createAppointmentSchema } = require('../../validations/extra.validation')

router.get('/doctors', appointmentController.getDoctors) // Public route to list doctors

router.use(authenticateClientJwt)

router.get('/', appointmentController.getAppointments)
router.post('/', validate(createAppointmentSchema), appointmentController.createAppointment)
router.patch('/:id/cancel', appointmentController.cancelAppointment)

module.exports = router
