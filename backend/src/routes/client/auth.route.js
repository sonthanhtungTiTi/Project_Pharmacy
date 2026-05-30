const express = require('express')

const authController = require('../../controllers/client/auth.controller')
const { authenticateClientJwt, authorizeSelfOrAdmin } = require('../../middleware/auth.middleware')

const router = express.Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/forgot-password', authController.forgotPassword)
router.post('/forgot-password/verify-otp', authController.verifyForgotPasswordOtp)
router.post('/forgot-password/reset', authController.resetForgotPassword)
router.put('/profile/:userId', authenticateClientJwt, authorizeSelfOrAdmin('userId'), authController.updateProfile)
router.post('/google', authController.googleLoginOrRegister)
router.post('/google/code', authController.googleLoginOrRegisterByCode)

module.exports = router
