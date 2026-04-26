const Joi = require('joi')

const loginSchema = Joi.object({
	phoneOrEmail: Joi.string().required().messages({
		'any.required': 'Số điện thoại hoặc email là bắt buộc',
	}),
	password: Joi.string().min(6).required().messages({
		'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
		'any.required': 'Mật khẩu là bắt buộc',
	}),
})

// Admin login schema - riêng cho admin
const loginAdminSchema = Joi.object({
	email: Joi.string().email().required().messages({
		'string.email': 'Email không hợp lệ',
		'any.required': 'Email là bắt buộc',
	}),
	password: Joi.string().min(6).required().messages({
		'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
		'any.required': 'Mật khẩu là bắt buộc',
	}),
})

const registerSchema = Joi.object({
	fullName: Joi.string().trim().min(2).max(100).required(),
	email: Joi.string().email().required(),
	phone: Joi.string().pattern(/^[0-9]{10,11}$/).required().messages({
		'string.pattern.base': 'Số điện thoại phải có 10-11 chữ số',
	}),
	password: Joi.string().min(6).max(100).required(),
})

const forgotPasswordSchema = Joi.object({
	email: Joi.string().email().required(),
})

const verifyOtpSchema = Joi.object({
	email: Joi.string().email().required(),
	otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
})

// Admin register schema - tạo tài khoản admin/staff với chọn role
const registerAdminSchema = Joi.object({
	fullName: Joi.string().trim().min(2).max(100).required().messages({
		'string.min': 'Họ tên phải có ít nhất 2 ký tự',
		'string.max': 'Họ tên không được vượt quá 100 ký tự',
		'any.required': 'Họ tên là bắt buộc',
	}),
	email: Joi.string().email().required().messages({
		'string.email': 'Email không hợp lệ',
		'any.required': 'Email là bắt buộc',
	}),
	phone: Joi.string()
		.pattern(/^[0-9]{10,11}$/)
		.required()
		.messages({
			'string.pattern.base': 'Số điện thoại phải có 10-11 chữ số',
			'any.required': 'Số điện thoại là bắt buộc',
		}),
	password: Joi.string().min(6).max(100).required().messages({
		'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
		'string.max': 'Mật khẩu không được vượt quá 100 ký tự',
		'any.required': 'Mật khẩu là bắt buộc',
	}),
	confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
		'any.only': 'Mật khẩu xác nhận không khớp',
		'any.required': 'Xác nhận mật khẩu là bắt buộc',
	}),
	role: Joi.string()
		.valid('admin', 'pharmacist', 'manager', 'sales_staff', 'warehouse_staff')
		.required()
		.messages({
			'any.only': 'Vai trò không hợp lệ. Chỉ chấp nhận: admin, pharmacist, manager, sales_staff, warehouse_staff',
			'any.required': 'Vai trò là bắt buộc',
		}),
})

// Forgot password schema - yêu cầu OTP để reset password
const forgotPasswordAdminSchema = Joi.object({
	email: Joi.string().email().required().messages({
		'string.email': 'Email không hợp lệ',
		'any.required': 'Email là bắt buộc',
	}),
})

// Verify OTP schema
const verifyPasswordOtpSchema = Joi.object({
	email: Joi.string().email().required().messages({
		'string.email': 'Email không hợp lệ',
		'any.required': 'Email là bắt buộc',
	}),
	otp: Joi.string()
		.length(6)
		.pattern(/^[0-9]+$/)
		.required()
		.messages({
			'string.length': 'OTP phải có 6 chữ số',
			'string.pattern.base': 'OTP phải là các chữ số',
			'any.required': 'OTP là bắt buộc',
		}),
})

// Reset password schema
const resetPasswordSchema = Joi.object({
	email: Joi.string().email().required().messages({
		'string.email': 'Email không hợp lệ',
		'any.required': 'Email là bắt buộc',
	}),
	otp: Joi.string()
		.length(6)
		.pattern(/^[0-9]+$/)
		.required()
		.messages({
			'string.length': 'OTP phải có 6 chữ số',
			'string.pattern.base': 'OTP phải là các chữ số',
			'any.required': 'OTP là bắt buộc',
		}),
	newPassword: Joi.string().min(6).max(100).required().messages({
		'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
		'string.max': 'Mật khẩu không được vượt quá 100 ký tự',
		'any.required': 'Mật khẩu mới là bắt buộc',
	}),
	confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
		'any.only': 'Mật khẩu xác nhận không khớp',
		'any.required': 'Xác nhận mật khẩu là bắt buộc',
	}),
})

module.exports = {
	loginSchema,
	loginAdminSchema,
	registerSchema,
	registerAdminSchema,
	forgotPasswordSchema,
	forgotPasswordAdminSchema,
	verifyOtpSchema,
	verifyPasswordOtpSchema,
	resetPasswordSchema,
}
