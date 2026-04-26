const Joi = require('joi')
const { ROLE_LIST, DEPARTMENT_LIST } = require('../constants/roles')

const userQuerySchema = Joi.object({
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(20),
	search: Joi.string().trim().max(200),
	role: Joi.string().valid(...ROLE_LIST),
	status: Joi.string().valid('active', 'inactive', 'all').default('all'),
})

const createUserSchema = Joi.object({
	fullName: Joi.string().trim().min(2).max(100).required(),
	email: Joi.string().email().required(),
	phone: Joi.string().pattern(/^[0-9]{10,11}$/).allow('').messages({
		'string.pattern.base': 'Số điện thoại phải có 10-11 chữ số',
	}),
	password: Joi.string().min(6).max(100).required(),
	role: Joi.string().valid(...ROLE_LIST).default('customer'),
	department: Joi.string().valid(...DEPARTMENT_LIST, null).default(null),
})

const updateUserSchema = Joi.object({
	fullName: Joi.string().trim().min(2).max(100),
	phone: Joi.string().pattern(/^[0-9]{10,11}$/).allow(''),
	address: Joi.string().trim().max(500).allow(''),
	dateOfBirth: Joi.date().iso(),
	department: Joi.string().valid(...DEPARTMENT_LIST, null),
}).min(1)

const updateUserRoleSchema = Joi.object({
	role: Joi.string().valid(...ROLE_LIST).required(),
	department: Joi.string().valid(...DEPARTMENT_LIST, null),
})

module.exports = {
	userQuerySchema,
	createUserSchema,
	updateUserSchema,
	updateUserRoleSchema,
}
