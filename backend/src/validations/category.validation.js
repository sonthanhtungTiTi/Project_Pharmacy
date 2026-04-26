const Joi = require('joi')

const createCategorySchema = Joi.object({
	categoryName: Joi.string().trim().min(1).max(200).required(),
	parentId: Joi.alternatives().try(Joi.string().trim(), Joi.allow(null)).default(null),
	isActive: Joi.boolean().default(true),
})

const updateCategorySchema = Joi.object({
	categoryName: Joi.string().trim().min(1).max(200),
	parentId: Joi.alternatives().try(Joi.string().trim(), Joi.allow(null)),
	isActive: Joi.boolean(),
}).min(1)

module.exports = { createCategorySchema, updateCategorySchema }
