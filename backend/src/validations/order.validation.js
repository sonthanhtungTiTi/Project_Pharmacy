const Joi = require('joi')

const orderQuerySchema = Joi.object({
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(20),
	status: Joi.string().valid('pending', 'confirmed', 'shipping', 'completed', 'cancelled'),
	keyword: Joi.string().trim().max(200),
	dateFrom: Joi.date().iso(),
	dateTo: Joi.date().iso(),
})

const updateOrderStatusSchema = Joi.object({
	status: Joi.string().valid('pending', 'confirmed', 'shipping', 'completed', 'cancelled'),
	paymentStatus: Joi.string().valid('unpaid', 'pending', 'paid', 'failed', 'refunded'),
	adminNote: Joi.string().trim().max(1000).allow(''),
}).min(1)

const updateOrderPaymentStatusSchema = Joi.object({
	paymentStatus: Joi.string().valid('pending', 'paid', 'failed').required(),
	adminNote: Joi.string().trim().max(1000).allow(''),
	cancelReason: Joi.string().trim().max(1000).allow(''),
})

const checkoutSchema = Joi.object({
	addressId: Joi.string().required(),
	paymentMethod: Joi.string().valid('cod', 'bank_transfer', 'e_wallet', 'momo').default('cod'),
	note: Joi.string().trim().max(500).allow('').default(''),
	selectedProductIds: Joi.array().items(Joi.string().trim().required()).default([]),
})

module.exports = { orderQuerySchema, updateOrderStatusSchema, updateOrderPaymentStatusSchema, checkoutSchema }
