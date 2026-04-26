const Joi = require('joi')

const createConsultationSchema = Joi.object({
	fullName: Joi.string().trim().min(2).max(100).required().messages({
		'string.min': 'Tên phải ít nhất 2 ký tự',
		'string.max': 'Tên tối đa 100 ký tự',
		'any.required': 'Tên là bắt buộc',
	}),
	phone: Joi.string().pattern(/^[0-9]{10,11}$/).required().messages({
		'string.pattern.base': 'Số điện thoại phải có 10-11 chữ số',
		'any.required': 'Số điện thoại là bắt buộc',
	}),
	email: Joi.string().email().required().messages({
		'string.email': 'Email không hợp lệ',
		'any.required': 'Email là bắt buộc',
	}),
	consultationDate: Joi.date().iso().required().messages({
		'date.base': 'Ngày tư vấn phải là định dạng ngày hợp lệ',
		'any.required': 'Ngày tư vấn là bắt buộc',
	}),
	consultationType: Joi.string().valid('online', 'offline', 'phone').default('online').messages({
		'any.only': 'Loại tư vấn phải là: online, offline hoặc phone',
	}),
	topic: Joi.string().trim().min(5).max(200).required().messages({
		'string.min': 'Chủ đề tư vấn phải ít nhất 5 ký tự',
		'string.max': 'Chủ đề tư vấn tối đa 200 ký tự',
		'any.required': 'Chủ đề tư vấn là bắt buộc',
	}),
	description: Joi.string().trim().max(1000).default('').messages({
		'string.max': 'Mô tả tối đa 1000 ký tự',
	}),
	offlineLocation: Joi.when('consultationType', {
		is: 'offline',
		then: Joi.string().trim().min(5).required().messages({
			'any.required': 'Địa chỉ chi nhánh là bắt buộc khi chọn tư vấn offline',
		}),
		otherwise: Joi.string().trim().default(''),
	}),
	note: Joi.string().trim().max(500).default('').messages({
		'string.max': 'Ghi chú tối đa 500 ký tự',
	}),
})

const updateConsultationStatusSchema = Joi.object({
	status: Joi.string().valid('confirmed', 'cancelled', 'completed').required().messages({
		'any.only': 'Trạng thái phải là: confirmed, cancelled hoặc completed',
		'any.required': 'Trạng thái là bắt buộc',
	}),
	cancellationReason: Joi.when('status', {
		is: 'cancelled',
		then: Joi.string().trim().min(5).required().messages({
			'any.required': 'Lý do hủy là bắt buộc',
		}),
		otherwise: Joi.string().trim().default(''),
	}),
	meetingLink: Joi.when('status', {
		is: 'confirmed',
		then: Joi.string().trim().required().messages({
			'any.required': 'Link cuộc họp là bắt buộc khi xác nhận',
		}),
		otherwise: Joi.string().trim().default(''),
	}),
})

module.exports = {
	createConsultationSchema,
	updateConsultationStatusSchema,
}
