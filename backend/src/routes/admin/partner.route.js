const express = require('express')
const { authenticateClientJwt, authorizeAdmin } = require('../../middleware/auth.middleware')
const partnerController = require('../../controllers/admin/partner.controller')
const { validate } = require('../../middleware/validate')
const { updatePartnerStatusSchema } = require('../../validations/extra.validation')

const router = express.Router()

router.use(authenticateClientJwt, authorizeAdmin)

router.get('/', partnerController.getPartnerRequests)
router.patch('/:id/status', validate(updatePartnerStatusSchema), partnerController.updatePartnerRequestStatus)

module.exports = router
