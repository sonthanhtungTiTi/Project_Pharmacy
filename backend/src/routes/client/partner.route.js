const express = require('express')
const partnerController = require('../../controllers/client/partner.controller')

const { validate } = require('../../middleware/validate')
const { partnerRequestSchema } = require('../../validations/extra.validation')

const router = express.Router()

router.post('/', validate(partnerRequestSchema), partnerController.submitPartnerRequest)

module.exports = router
