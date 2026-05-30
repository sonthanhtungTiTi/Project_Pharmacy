/**
 * Role Constants & Permission Matrix
 * Hệ thống phân quyền RBAC cho Nhà Thuốc T&Q
 */

const ROLES = {
	CUSTOMER: 'customer',
	PHARMACIST: 'pharmacist',
	WAREHOUSE_STAFF: 'warehouse_staff',
	SALES_STAFF: 'sales_staff',
	MANAGER: 'manager',
	ADMIN: 'admin',
	BANNED: 'banned',
}

const ROLE_LIST = Object.values(ROLES)

const DEPARTMENTS = {
	WAREHOUSE: 'warehouse',
	SALES: 'sales',
	PHARMACY: 'pharmacy',
	MANAGEMENT: 'management',
}

const DEPARTMENT_LIST = Object.values(DEPARTMENTS)

/**
 * Permission matrix — mỗi role có những quyền gì
 */
const ROLE_PERMISSIONS = {
	[ROLES.CUSTOMER]: [
		'product:read',
		'cart:manage',
		'order:create',
		'order:read_own',
		'address:manage',
		'review:create',
		'review:edit_own',
		'wishlist:manage',
		'chat:customer',
		'profile:manage',
		'health_news:read',
	],
	[ROLES.PHARMACIST]: [
		'product:read',
		'cart:manage',
		'order:create',
		'order:read_own',
		'address:manage',
		'review:create',
		'review:edit_own',
		'wishlist:manage',
		'chat:customer',
		'chat:pharmacist',
		'profile:manage',
		'health_news:read',
		'consultation:provide',
	],
	[ROLES.WAREHOUSE_STAFF]: [
		'product:read',
		'inventory:read',
		'inventory:import',
		'inventory:adjust',
		'inventory:report',
		'profile:manage',
	],
	[ROLES.SALES_STAFF]: [
		'product:read',
		'order:read_all',
		'order:update_status',
		'order:print_invoice',
		'customer:read',
		'profile:manage',
	],
	[ROLES.MANAGER]: [
		'product:read',
		'order:read_all',
		'order:update_status',
		'order:print_invoice',
		'inventory:read',
		'inventory:import',
		'inventory:adjust',
		'inventory:report',
		'customer:read',
		'analytics:read',
		'report:generate',
		'staff:manage',
		'discount:approve',
		'profile:manage',
	],
	[ROLES.ADMIN]: ['*'], // Quyền tuyệt đối
	[ROLES.BANNED]: [],    // Không có quyền gì
}

/**
 * Nhóm roles thường dùng cho route authorization
 */
const ROLE_GROUPS = {
	// Ai cũng có thể truy cập (đã đăng nhập)
	ALL_AUTHENTICATED: [ROLES.CUSTOMER, ROLES.PHARMACIST, ROLES.WAREHOUSE_STAFF, ROLES.SALES_STAFF, ROLES.MANAGER, ROLES.ADMIN],

	// Staff trở lên (không bao gồm customer/pharmacist)
	STAFF_AND_ABOVE: [ROLES.WAREHOUSE_STAFF, ROLES.SALES_STAFF, ROLES.MANAGER, ROLES.ADMIN],

	// Quản lý order
	ORDER_MANAGERS: [ROLES.SALES_STAFF, ROLES.MANAGER, ROLES.ADMIN],

	// Quản lý kho
	INVENTORY_MANAGERS: [ROLES.WAREHOUSE_STAFF, ROLES.MANAGER, ROLES.ADMIN],

	// Quản lý cấp cao
	MANAGEMENT: [ROLES.MANAGER, ROLES.ADMIN],

	// Chỉ admin
	ADMIN_ONLY: [ROLES.ADMIN],
}

/**
 * Kiểm tra user có permission hay không
 */
const hasPermission = (userRole, requiredPermission) => {
	if (userRole === ROLES.BANNED) return false
	if (userRole === ROLES.ADMIN) return true

	const permissions = ROLE_PERMISSIONS[userRole] || []
	return permissions.includes(requiredPermission) || permissions.includes('*')
}

/**
 * Kiểm tra user có 1 trong các roles hay không
 */
const hasRole = (userRole, allowedRoles) => {
	return allowedRoles.includes(userRole)
}

module.exports = {
	ROLES,
	ROLE_LIST,
	DEPARTMENTS,
	DEPARTMENT_LIST,
	ROLE_PERMISSIONS,
	ROLE_GROUPS,
	hasPermission,
	hasRole,
}
