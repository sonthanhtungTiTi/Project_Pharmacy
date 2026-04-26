const Joi = require('joi')

const createAddressSchema = Joi.object({
	label: Joi.string().valid('home', 'office', 'other').default('other'),
	recipientName: Joi.string().trim().min(2).max(100).required(),
	phone: Joi.string().pattern(/^[0-9]{10,11}$/).required(),
	provinceCode: Joi.string().trim().allow('').default(''),
	provinceName: Joi.string().trim().required(),
	districtCode: Joi.string().trim().allow('').default(''),
	districtName: Joi.string().trim().required(),
	wardCode: Joi.string().trim().allow('').default(''),
	wardName: Joi.string().trim().required(),
	street: Joi.string().trim().required(),
	note: Joi.string().trim().allow('').default(''),
	isDefault: Joi.boolean().default(false),
})

const updateAddressSchema = Joi.object({
	label: Joi.string().valid('home', 'office', 'other'),
	recipientName: Joi.string().trim().min(2).max(100),
	phone: Joi.string().pattern(/^[0-9]{10,11}$/),
	provinceCode: Joi.string().trim().allow(''),
	provinceName: Joi.string().trim(),
	districtCode: Joi.string().trim().allow(''),
	districtName: Joi.string().trim(),
	wardCode: Joi.string().trim().allow(''),
	wardName: Joi.string().trim(),
	street: Joi.string().trim(),
	note: Joi.string().trim().allow(''),
	isDefault: Joi.boolean(),
}).min(1)

module.exports = { createAddressSchema, updateAddressSchema }
