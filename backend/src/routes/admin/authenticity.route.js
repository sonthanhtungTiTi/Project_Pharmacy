const express = require('express')
const { authenticateClientJwt, authorizeAdmin } = require('../../middleware/auth.middleware')
const authenticityController = require('../../controllers/admin/authenticity.controller')

const { validate } = require('../../middleware/validate')
const { importAuthenticitySchema } = require('../../validations/extra.validation')

const router = express.Router()

router.use(authenticateClientJwt, authorizeAdmin)

router.post('/import', validate(importAuthenticitySchema), authenticityController.importCodes)
router.get('/', authenticityController.getCodes)

module.exports = router
