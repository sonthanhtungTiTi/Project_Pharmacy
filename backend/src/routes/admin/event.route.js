const express = require('express')
const { authenticateClientJwt, authorizeAdmin } = require('../../middleware/auth.middleware')
const eventController = require('../../controllers/admin/event.controller')

const { validate } = require('../../middleware/validate')
const { createEventSchema, updateEventSchema } = require('../../validations/extra.validation')

const router = express.Router()

router.use(authenticateClientJwt, authorizeAdmin)

router.post('/', validate(createEventSchema), eventController.createEvent)
router.patch('/:id', validate(updateEventSchema), eventController.updateEvent)
router.delete('/:id', eventController.deleteEvent)
router.patch('/:id/publish', eventController.publishEvent)

module.exports = router
