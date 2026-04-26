const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const User = require('../../models/user.model')
const { ROLES, ROLE_LIST } = require('../../constants/roles')

class AdminUserServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

/**
 * Serialize user cho admin view
 */
const serializeUser = (doc) => ({
	id: String(doc._id),
	fullName: doc.fullName,
	email: doc.email,
	phone: doc.phone || '',
	avatar: doc.avatar || '',
	role: doc.role || 'customer',
	department: doc.department || null,
	provider: doc.provider || 'local',
	isActive: doc.isActive !== false,
	address: doc.address || '',
	dateOfBirth: doc.dateOfBirth || null,
	lastLoginAt: doc.lastLoginAt,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
})

/**
 * Danh sách users với pagination, search, filter
 */
const listUsers = async ({ page = 1, limit = 20, search, role, status = 'all' } = {}) => {
	const numericPage = Math.max(1, Number(page) || 1)
	const numericLimit = Math.min(100, Math.max(1, Number(limit) || 20))
	const skip = (numericPage - 1) * numericLimit

	const filter = {}

	// Filter theo role
	if (role && ROLE_LIST.includes(role)) {
		filter.role = role
	}

	// Filter theo status
	if (status === 'active') {
		filter.isActive = { $ne: false }
	} else if (status === 'inactive') {
		filter.isActive = false
	}

	// Search
	if (search) {
		const keyword = String(search).trim()
		if (keyword) {
			const regex = { $regex: keyword, $options: 'i' }
			filter.$or = [
				{ fullName: regex },
				{ email: regex },
				{ phone: regex },
			]
		}
	}

	const [users, total] = await Promise.all([
		User.find(filter)
			.select('-password -__v')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(numericLimit)
			.lean(),
		User.countDocuments(filter),
	])

	return {
		items: users.map(serializeUser),
		pagination: {
			page: numericPage,
			limit: numericLimit,
			total,
			totalPages: Math.max(1, Math.ceil(total / numericLimit)),
		},
	}
}

/**
 * Chi tiết user
 */
const getUserDetail = async (userId) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new AdminUserServiceError('userId không hợp lệ', 400)
	}

	const user = await User.findById(userId).select('-password -__v').lean()
	if (!user) {
		throw new AdminUserServiceError('User không tồn tại', 404)
	}

	return serializeUser(user)
}

/**
 * Tạo user mới (admin tạo staff account)
 */
const createUser = async (data) => {
	// Check email trùng
	const existing = await User.findOne({ email: data.email.toLowerCase().trim() })
	if (existing) {
		throw new AdminUserServiceError('Email đã được sử dụng', 409)
	}

	// Check phone trùng (nếu có)
	if (data.phone) {
		const existingPhone = await User.findOne({ phone: data.phone.trim() })
		if (existingPhone) {
			throw new AdminUserServiceError('Số điện thoại đã được sử dụng', 409)
		}
	}

	// Hash password
	if (data.password) {
		const salt = await bcrypt.genSalt(10)
		data.password = await bcrypt.hash(data.password, salt)
	}

	const user = new User({
		fullName: data.fullName,
		email: data.email.toLowerCase().trim(),
		phone: data.phone || '',
		password: data.password,
		role: data.role || ROLES.CUSTOMER,
		department: data.department || null,
		provider: 'local',
		isActive: true,
	})

	await user.save()

	return serializeUser(user)
}

/**
 * Cập nhật thông tin user
 */
const updateUser = async (userId, data) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new AdminUserServiceError('userId không hợp lệ', 400)
	}

	const user = await User.findById(userId)
	if (!user) {
		throw new AdminUserServiceError('User không tồn tại', 404)
	}

	// Các field được phép update
	const allowedFields = ['fullName', 'phone', 'address', 'dateOfBirth', 'department']
	for (const field of allowedFields) {
		if (data[field] !== undefined) {
			user[field] = data[field]
		}
	}

	await user.save()

	return serializeUser(user)
}

/**
 * Đổi role cho user
 */
const updateUserRole = async (userId, { role, department } = {}) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new AdminUserServiceError('userId không hợp lệ', 400)
	}

	if (!role || !ROLE_LIST.includes(role)) {
		throw new AdminUserServiceError(`Role không hợp lệ. Chấp nhận: ${ROLE_LIST.join(', ')}`, 400)
	}

	const user = await User.findById(userId)
	if (!user) {
		throw new AdminUserServiceError('User không tồn tại', 404)
	}

	// Không cho phép đổi role admin khác
	if (user.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
		throw new AdminUserServiceError('Không thể hạ quyền Admin', 403)
	}

	user.role = role
	if (department !== undefined) {
		user.department = department
	}

	await user.save()

	return serializeUser(user)
}

/**
 * Ban user
 */
const banUser = async (userId, { reason } = {}) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new AdminUserServiceError('userId không hợp lệ', 400)
	}

	const user = await User.findById(userId)
	if (!user) {
		throw new AdminUserServiceError('User không tồn tại', 404)
	}

	if (user.role === ROLES.ADMIN) {
		throw new AdminUserServiceError('Không thể ban tài khoản Admin', 403)
	}

	user.isActive = false
	user.role = ROLES.BANNED
	await user.save()

	return serializeUser(user)
}

/**
 * Unban user — khôi phục tài khoản
 */
const unbanUser = async (userId) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new AdminUserServiceError('userId không hợp lệ', 400)
	}

	const user = await User.findById(userId)
	if (!user) {
		throw new AdminUserServiceError('User không tồn tại', 404)
	}

	user.isActive = true
	user.role = ROLES.CUSTOMER // Reset về customer
	await user.save()

	return serializeUser(user)
}

/**
 * Thống kê users theo role
 */
const getUserStats = async () => {
	const stats = await User.aggregate([
		{
			$group: {
				_id: '$role',
				count: { $sum: 1 },
			},
		},
	])

	const totalUsers = await User.countDocuments()
	const activeUsers = await User.countDocuments({ isActive: { $ne: false } })

	const byRole = {}
	for (const s of stats) {
		byRole[s._id || 'customer'] = s.count
	}

	return {
		total: totalUsers,
		active: activeUsers,
		inactive: totalUsers - activeUsers,
		byRole,
	}
}

module.exports = {
	AdminUserServiceError,
	listUsers,
	getUserDetail,
	createUser,
	updateUser,
	updateUserRole,
	banUser,
	unbanUser,
	getUserStats,
}
