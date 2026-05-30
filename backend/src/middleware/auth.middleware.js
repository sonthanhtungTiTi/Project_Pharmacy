const jwt = require('jsonwebtoken')

const User = require('../models/user.model')

const getJwtSecret = () => process.env.JWT_SECRET || 'dev-secret-change-me'

const getBearerToken = (authorizationHeader) => {
	if (!authorizationHeader || typeof authorizationHeader !== 'string') {
		return ''
	}

	if (!authorizationHeader.startsWith('Bearer ')) {
		return ''
	}

	return authorizationHeader.slice('Bearer '.length).trim()
}

const authenticateClientJwt = async (req, res, next) => {
	try {
		const token = getBearerToken(req.headers.authorization)

		if (!token) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
				error: 'Access token is missing',
			})
		}

		const payload = jwt.verify(token, getJwtSecret())

		if (!payload?.userId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
				error: 'Token payload is invalid',
			})
		}

		const user = await User.findById(payload.userId)
			.select('_id email role isActive provider fullName')
			.lean()

		if (!user || user.isActive === false) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
				error: 'User is invalid or inactive',
			})
		}

		const authContext = {
			userId: String(user._id),
			email: user.email,
			role: user.role,
			provider: user.provider,
			fullName: user.fullName,
		}

		req.user = authContext
		req.auth = authContext

		next()
	} catch (error) {
		const isExpired = error?.name === 'TokenExpiredError'

		return res.status(401).json({
			success: false,
			message: 'Unauthorized',
			error: isExpired ? 'Access token has expired' : 'Access token is invalid',
		})
	}
}

const authorizeSelfOrAdmin = (paramName = 'userId') => (req, res, next) => {
	if (!req.auth?.userId) {
		return res.status(401).json({
			success: false,
			message: 'Unauthorized',
			error: 'Authentication context is missing',
		})
	}

	const targetUserId = String(req.params?.[paramName] || '').trim()

	if (!targetUserId) {
		return res.status(400).json({
			success: false,
			message: 'Bad request',
			error: `${paramName} is required`,
		})
	}

	if (req.auth.role === 'admin' || req.auth.userId === targetUserId) {
		next()
		return
	}

	return res.status(403).json({
		success: false,
		message: 'Forbidden',
		error: 'You are not allowed to access this resource',
	})
}

const authorizeAdmin = (req, res, next) => {
	if (!req.auth?.userId) {
		return res.status(401).json({
			success: false,
			message: 'Unauthorized',
			error: 'Authentication context is missing',
		})
	}

	if (req.auth.role !== 'admin') {
		return res.status(403).json({
			success: false,
			message: 'Forbidden',
			error: 'Admin permission is required',
		})
	}

	next()
}

const authorizeStaff = (req, res, next) => {
	if (!req.auth?.userId) {
		return res.status(401).json({
			success: false,
			message: 'Unauthorized',
			error: 'Authentication context is missing',
		})
	}

	// Các role được phép: admin, pharmacist, warehouse_staff, sales_staff, manager
	const allowedRoles = ['admin', 'pharmacist', 'warehouse_staff', 'sales_staff', 'manager']

	if (!allowedRoles.includes(req.auth.role)) {
		return res.status(403).json({
			success: false,
			message: 'Forbidden',
			error: 'Staff permission is required',
		})
	}

	next()
}

module.exports = {
	authenticateClientJwt,
	authorizeSelfOrAdmin,
	authorizeAdmin,
	authorizeStaff,
}
