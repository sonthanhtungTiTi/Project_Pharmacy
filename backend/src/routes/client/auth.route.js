const express = require('express')

const authController = require('../../controllers/client/auth.controller')
const faceAuthController = require('../../controllers/client/faceAuth.controller')
const { authenticateClientJwt, authorizeSelfOrAdmin } = require('../../middleware/auth.middleware')
const { upload } = require('../../services/upload.service')
const rateLimit = require('express-rate-limit')

// Giới hạn 5 lần đăng nhập Face ID mỗi 15 phút chống spam
const faceLoginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	max: 5,
	message: { success: false, message: 'Quá nhiều lần thử, vui lòng đợi 15 phút rồi thử lại' }
})

const router = express.Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/forgot-password', authController.forgotPassword)
router.post('/forgot-password/verify-otp', authController.verifyForgotPasswordOtp)
router.post('/forgot-password/reset', authController.resetForgotPassword)
router.put('/profile/:userId', authenticateClientJwt, authorizeSelfOrAdmin('userId'), authController.updateProfile)
router.post('/google', authController.googleLoginOrRegister)
router.post('/google/code', authController.googleLoginOrRegisterByCode)

// Routes cho Face ID
router.post('/face/enroll', authenticateClientJwt, faceAuthController.enrollFaceId)
router.post('/face/disable', authenticateClientJwt, faceAuthController.disableFaceId)
router.post('/face/login', faceLoginLimiter, faceAuthController.loginWithFaceId)

module.exports = router
