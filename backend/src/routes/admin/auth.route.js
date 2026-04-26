const express = require('express')

const authController = require('../../controllers/admin/auth.controller')
const passwordResetController = require('../../controllers/client/password-reset.controller')
const { authenticateClientJwt, authorizeAdmin } = require('../../middleware/auth.middleware')
const { validate } = require('../../middleware/validate')
const { loginAdminSchema, registerAdminSchema, forgotPasswordAdminSchema, verifyPasswordOtpSchema, resetPasswordSchema } = require('../../validations/auth.validation')

const router = express.Router()

// Public routes - Login only
router.post('/login', validate(loginAdminSchema), authController.login)

// Public routes - Password Reset (cho admin & staff)
router.post('/forgot-password', validate(forgotPasswordAdminSchema), passwordResetController.sendPasswordResetOTP)
router.post('/forgot-password/verify-otp', validate(verifyPasswordOtpSchema), passwordResetController.verifyPasswordResetOTP)
router.post('/forgot-password/reset', validate(resetPasswordSchema), passwordResetController.resetPasswordWithOTP)

// Protected (cần auth + admin role) - Admin tạo tài khoản cho nhân viên
router.use(authenticateClientJwt)

// [Admin] POST: Tạo tài khoản nhân viên mới
router.post('/register', authorizeAdmin, validate(registerAdminSchema), authController.register)

// Protected (cần auth + admin role) - Các endpoint khác
router.use(authorizeAdmin)

router.post('/refresh', authController.refresh)
router.get('/me', authController.getMe)
router.post('/logout', authController.logout)

module.exports = router
