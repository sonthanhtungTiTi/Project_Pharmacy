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

const otpLimiter = rateLimit({
	windowMs: 10 * 60 * 1000, 
	max: 3,
	message: { success: false, message: 'Bạn đã yêu cầu gửi mã OTP quá nhiều lần. Vui lòng đợi 10 phút rồi thử lại.' }
})

const router = express.Router()

router.post('/register', otpLimiter, authController.register)
router.post('/register/verify-otp', authController.verifyRegisterOtp)
router.post('/login', authController.login)
router.post('/forgot-password', otpLimiter, authController.forgotPassword)
router.post('/forgot-password/verify-otp', authController.verifyForgotPasswordOtp)
router.post('/forgot-password/reset', authController.resetForgotPassword)
router.put('/profile/:userId', authenticateClientJwt, authorizeSelfOrAdmin('userId'), authController.updateProfile)
router.post('/google', authController.googleLoginOrRegister)
router.post('/google/code', authController.googleLoginOrRegisterByCode)

// Routes cho Face ID
router.post('/face/enroll', authenticateClientJwt, upload.array('faceImages', 3), faceAuthController.enrollFaceId)
router.post('/face/disable', authenticateClientJwt, faceAuthController.disableFaceId)
router.post('/face/login', faceLoginLimiter, upload.array('faceImages', 3), faceAuthController.loginWithFaceId)

module.exports = router
