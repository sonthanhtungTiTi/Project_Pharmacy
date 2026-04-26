const passwordResetService = require('../../services/client/password-reset.service')

/**
 * POST: Gửi OTP cho quên mật khẩu
 */
const sendPasswordResetOTP = async (req, res) => {
	try {
		const { email, phoneOrEmail } = req.body

		const data = await passwordResetService.sendPasswordResetOTP({
			email,
			phoneOrEmail,
		})

		return res.status(200).json({
			success: true,
			message: 'OTP đã được gửi',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Gửi OTP thất bại',
		})
	}
}

/**
 * POST: Xác thực OTP
 */
const verifyPasswordResetOTP = async (req, res) => {
	try {
		const { email, otp } = req.body

		const data = await passwordResetService.verifyPasswordResetOTP({
			email,
			otp,
		})

		return res.status(200).json({
			success: true,
			message: 'OTP xác thực thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Xác thực OTP thất bại',
		})
	}
}

/**
 * POST: Reset password bằng OTP
 */
const resetPasswordWithOTP = async (req, res) => {
	try {
		const { email, otp, newPassword, confirmPassword } = req.body

		const data = await passwordResetService.resetPasswordWithOTP({
			email,
			otp,
			newPassword,
			confirmPassword,
		})

		return res.status(200).json({
			success: true,
			message: 'Mật khẩu đã được đặt lại thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Đặt lại mật khẩu thất bại',
		})
	}
}

module.exports = {
	sendPasswordResetOTP,
	verifyPasswordResetOTP,
	resetPasswordWithOTP,
}
