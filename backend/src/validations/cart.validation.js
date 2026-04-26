const Joi = require('joi')

const addCartItemSchema = Joi.object({
	productId: Joi.string().required(),
	quantity: Joi.number().integer().min(1).default(1),
})

const updateCartItemSchema = Joi.object({
	quantity: Joi.number().integer().min(1).required(),
})

module.exports = { addCartItemSchema, updateCartItemSchema }
