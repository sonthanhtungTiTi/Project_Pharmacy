/**
 * Joi Validation Middleware
 * Dùng: router.post('/', validate(schema), controller.create)
 * hoặc: router.get('/', validate(querySchema, 'query'), controller.list)
 */

const validate = (schema, property = 'body') => {
	return (req, res, next) => {
		const { error, value } = schema.validate(req[property], {
			abortEarly: false,
			stripUnknown: true,
		})

		if (error) {
			const details = error.details.map((d) => ({
				field: d.path.join('.'),
				message: d.message,
			}))

			return res.status(400).json({
				success: false,
				message: 'Validation failed',
				details,
			})
		}

		// Replace request data with validated + sanitized values
		req[property] = value
		next()
	}
}

module.exports = { validate }
