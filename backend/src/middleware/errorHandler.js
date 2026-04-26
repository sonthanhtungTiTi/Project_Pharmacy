/**
 * Centralized Error Handling Middleware
 * Tất cả route có thể dùng: next(new ApiError(400, 'message'))
 * hoặc throw new ApiError(400, 'message') trong async handler
 */

class ApiError extends Error {
	constructor(statusCode, message, details = null) {
		super(message)
		this.statusCode = statusCode
		this.details = details
		this.isOperational = true
	}

	static badRequest(message, details) {
		return new ApiError(400, message, details)
	}

	static unauthorized(message = 'Unauthorized') {
		return new ApiError(401, message)
	}

	static forbidden(message = 'Forbidden') {
		return new ApiError(403, message)
	}

	static notFound(message = 'Not found') {
		return new ApiError(404, message)
	}

	static conflict(message) {
		return new ApiError(409, message)
	}

	static internal(message = 'Internal server error') {
		return new ApiError(500, message)
	}
}

/**
 * Wrap async route handlers để tự động catch errors
 * Dùng: router.get('/', asyncHandler(controller.list))
 */
const asyncHandler = (fn) => (req, res, next) => {
	Promise.resolve(fn(req, res, next)).catch(next)
}

/**
 * Global error handler middleware — đặt cuối cùng trong app.use()
 */
const errorHandler = (err, req, res, next) => {
	// Nếu đã gửi response thì bỏ qua
	if (res.headersSent) {
		return next(err)
	}

	const statusCode = err.statusCode || err.status || 500
	const message = err.message || 'Internal server error'

	const response = {
		success: false,
		message,
	}

	if (err.details) {
		response.details = err.details
	}

	if (process.env.NODE_ENV === 'development') {
		response.stack = err.stack
	}

	// Log lỗi server (5xx)
	if (statusCode >= 500) {
		console.error(`[ERROR] ${statusCode} - ${message}`, err.stack)
	}

	res.status(statusCode).json(response)
}

module.exports = { ApiError, asyncHandler, errorHandler }
