const express = require('express')
const authenticityController = require('../../controllers/client/authenticity.controller')
const { optionalAuthenticateClientJwt } = require('../../middleware/auth.middleware')
const { validate } = require('../../middleware/validate')
const { authenticityCheckSchema } = require('../../validations/extra.validation')

const router = express.Router()

router.post('/', optionalAuthenticateClientJwt, validate(authenticityCheckSchema), authenticityController.checkAuthenticity)

module.exports = router
