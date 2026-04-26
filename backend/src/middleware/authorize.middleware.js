/**
 * Authorization Middleware — RBAC (Role-Based Access Control)
 * Kiểm tra user có role/permission phù hợp để truy cập endpoint
 *
 * Dùng:
 *   router.get('/', authorize(['admin', 'manager']), controller.list)
 *   router.post('/', authorize([], ['product:create']), controller.create)
 */

const { ROLES, hasPermission } = require('../constants/roles')

/**
 * Middleware kiểm tra role-based authorization
 * @param {string[]} allowedRoles - Các role được phép truy cập
 * @param {string[]} requiredPermissions - Các permission cần thiết (optional)
 */
const authorize = (allowedRoles = [], requiredPermissions = []) => {
	return (req, res, next) => {
		// Phải có auth context (từ authenticateClientJwt)
		if (!req.user && !req.auth) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
				error: 'Authentication is required',
			})
		}

		const authContext = req.user || req.auth
		const userRole = authContext.role

		// Tài khoản bị ban
		if (userRole === ROLES.BANNED) {
			return res.status(403).json({
				success: false,
				message: 'Forbidden',
				error: 'Tài khoản đã bị vô hiệu hóa',
			})
		}

		// Admin luôn có quyền
		if (userRole === ROLES.ADMIN) {
			return next()
		}

		// Kiểm tra role
		if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
			return res.status(403).json({
				success: false,
				message: 'Forbidden',
				error: `Yêu cầu một trong các quyền: ${allowedRoles.join(', ')}`,
			})
		}

		// Kiểm tra permissions
		if (requiredPermissions.length > 0) {
			const missingPermissions = requiredPermissions.filter(
				(perm) => !hasPermission(userRole, perm),
			)

			if (missingPermissions.length > 0) {
				return res.status(403).json({
					success: false,
					message: 'Forbidden',
					error: `Thiếu quyền: ${missingPermissions.join(', ')}`,
				})
			}
		}

		next()
	}
}

module.exports = { authorize }
