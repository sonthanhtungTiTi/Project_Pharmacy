const bcrypt = require('bcryptjs')
const User = require('../../models/user.model')
const OTP = require('../../models/otp.model')
const { generateOTP } = require('../../utils/otp.util')

class PasswordResetError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

/**
 * Gửi OTP cho yêu cầu quên mật khẩu
 */
const sendPasswordResetOTP = async ({ email, phoneOrEmail }) => {
	// Tìm user bằng email hoặc phone
	const identifier = email || phoneOrEmail
	if (!identifier) {
		throw new PasswordResetError('Email hoặc số điện thoại là bắt buộc', 400)
	}

	let user
	if (identifier.includes('@')) {
		// Email
		user = await User.findOne({ email: identifier.toLowerCase().trim() })
	} else {
		// Phone
		user = await User.findOne({ phone: identifier.trim() })
	}

	if (!user) {
		throw new PasswordResetError('Tài khoản không tồn tại', 404)
	}

	// Kiểm tra xem user có password không (Google-only account)
	if (!user.password && user.provider === 'google') {
		throw new PasswordResetError('Tài khoản này chỉ đăng nhập bằng Google. Vui lòng đăng nhập với Google để đặt lại mật khẩu.', 400)
	}

	// Xóa OTP cũ nếu có
	await OTP.deleteMany({ email: user.email })

	// Tạo OTP mới
	const otpCode = generateOTP()
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 phút

	const otp = new OTP({
		email: user.email,
		otp: otpCode,
		expiresAt,
		purpose: 'password_reset',
	})

	await otp.save()

	// TODO: Gửi OTP qua email (implement email service)
	console.log(`[PASSWORD RESET OTP] Email: ${user.email}, OTP: ${otpCode}`)

	return {
		message: 'OTP đã được gửi đến email của bạn',
		maskedEmail: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
		email: user.email, // Dev mode - xóa trong production
	}
}

/**
 * Xác thực OTP
 */
const verifyPasswordResetOTP = async ({ email, otp }) => {
	if (!email || !otp) {
		throw new PasswordResetError('Email và OTP là bắt buộc', 400)
	}

	const user = await User.findOne({ email: email.toLowerCase().trim() })
	if (!user) {
		throw new PasswordResetError('Tài khoản không tồn tại', 404)
	}

	// Tìm OTP
	const otpRecord = await OTP.findOne({
		email: user.email,
		otp: otp.trim(),
		purpose: 'password_reset',
	})

	if (!otpRecord) {
		throw new PasswordResetError('OTP không hợp lệ', 400)
	}

	// Kiểm tra hết hạn
	if (new Date() > otpRecord.expiresAt) {
		throw new PasswordResetError('OTP đã hết hạn', 400)
	}

	return {
		email: user.email,
		verified: true,
		message: 'OTP xác thực thành công',
	}
}

/**
 * Reset password bằng OTP
 */
const resetPasswordWithOTP = async ({ email, otp, newPassword, confirmPassword }) => {
	if (!email || !otp || !newPassword || !confirmPassword) {
		throw new PasswordResetError('Tất cả các trường là bắt buộc', 400)
	}

	if (newPassword !== confirmPassword) {
		throw new PasswordResetError('Mật khẩu xác nhận không khớp', 400)
	}

	if (newPassword.length < 6) {
		throw new PasswordResetError('Mật khẩu phải có ít nhất 6 ký tự', 400)
	}

	// Tìm user
	const user = await User.findOne({ email: email.toLowerCase().trim() })
	if (!user) {
		throw new PasswordResetError('Tài khoản không tồn tại', 404)
	}

	// Xác thực OTP
	const otpRecord = await OTP.findOne({
		email: user.email,
		otp: otp.trim(),
		purpose: 'password_reset',
	})

	if (!otpRecord) {
		throw new PasswordResetError('OTP không hợp lệ', 400)
	}

	if (new Date() > otpRecord.expiresAt) {
		throw new PasswordResetError('OTP đã hết hạn', 400)
	}

	// Hash password mới
	const salt = await bcrypt.genSalt(10)
	const hashedPassword = await bcrypt.hash(newPassword, salt)

	// Cập nhật password
	user.password = hashedPassword
	await user.save()

	// Xóa OTP đã sử dụng
	await OTP.deleteMany({ email: user.email, purpose: 'password_reset' })

	return {
		email: user.email,
		message: 'Mật khẩu đã được đặt lại thành công',
	}
}

module.exports = {
	sendPasswordResetOTP,
	verifyPasswordResetOTP,
	resetPasswordWithOTP,
	PasswordResetError,
}
