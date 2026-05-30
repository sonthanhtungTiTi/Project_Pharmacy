const express = require('express')
const { authenticateClientJwt } = require('../../middleware/auth.middleware')
const familyMedicineController = require('../../controllers/client/familyMedicine.controller')

const router = express.Router()

const { validate } = require('../../middleware/validate')
const { familyMedicineSchema } = require('../../validations/extra.validation')

router.use(authenticateClientJwt)

router.get('/', familyMedicineController.getFamilyMedicines)
router.post('/', validate(familyMedicineSchema), familyMedicineController.addFamilyMedicine)
router.patch('/:id', validate(familyMedicineSchema), familyMedicineController.updateFamilyMedicine)
router.delete('/:id', familyMedicineController.deleteFamilyMedicine)

module.exports = router
