const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

const User = require('../../models/user.model')

const getJwtSecret = () => process.env.JWT_SECRET || 'dev-secret-change-me'

class AdminAuthError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

/**
 * Admin/Staff Login — Cho phép tất cả nhân viên (admin, pharmacist, manager, sales_staff, warehouse_staff)
 */
const loginAdmin = async ({ email, password }) => {
	if (!email || !password) {
		throw new AdminAuthError('Email và mật khẩu là bắt buộc', 400)
	}

	const user = await User.findOne({ email: email.toLowerCase().trim() })

	if (!user) {
		throw new AdminAuthError('Email hoặc mật khẩu không đúng', 401)
	}

	// Chỉ cho phép staff roles đăng nhập (không cho customer)
	const allowedRoles = ['admin', 'pharmacist', 'manager', 'sales_staff', 'warehouse_staff']
	if (!allowedRoles.includes(user.role)) {
		throw new AdminAuthError('Tài khoản không có quyền truy cập hệ thống này', 403)
	}

	if (user.isActive === false) {
		throw new AdminAuthError('Tài khoản đã bị vô hiệu hóa', 403)
	}

	if (!user.password) {
		throw new AdminAuthError('Tài khoản này chỉ đăng nhập bằng Google', 400)
	}

	const isMatch = await bcrypt.compare(password, user.password)
	if (!isMatch) {
		throw new AdminAuthError('Email hoặc mật khẩu không đúng', 401)
	}

	// Generate tokens
	const accessToken = jwt.sign(
		{ userId: String(user._id), role: user.role },
		getJwtSecret(),
		{ expiresIn: '7d' },
	)

	// Update last login
	user.lastLoginAt = new Date()
	await user.save()

	return {
		accessToken,
		user: {
			id: String(user._id),
			fullName: user.fullName,
			email: user.email,
			phone: user.phone || '',
			avatar: user.avatar || '',
			role: user.role,
		},
		expiresIn: '7d',
	}
}

/**
 * Refresh admin/staff token
 */
const refreshAdminToken = async (userId) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new AdminAuthError('userId không hợp lệ', 400)
	}

	const user = await User.findById(userId).select('_id email role isActive fullName').lean()

	if (!user || user.isActive === false) {
		throw new AdminAuthError('Tài khoản không còn hoạt động', 401)
	}

	// Chỉ cho phép staff roles
	const allowedRoles = ['admin', 'pharmacist', 'manager', 'sales_staff', 'warehouse_staff']
	if (!allowedRoles.includes(user.role)) {
		throw new AdminAuthError('Không có quyền truy cập hệ thống này', 403)
	}

	const accessToken = jwt.sign(
		{ userId: String(user._id), role: user.role },
		getJwtSecret(),
		{ expiresIn: '7d' },
	)

	return {
		accessToken,
		user: {
			id: String(user._id),
			fullName: user.fullName,
			email: user.email,
			role: user.role,
		},
		expiresIn: '7d',
	}
}

/**
 * Get admin/staff profile
 */
const getAdminProfile = async (userId) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new AdminAuthError('userId không hợp lệ', 400)
	}

	const user = await User.findById(userId)
		.select('_id fullName email phone avatar role isActive createdAt lastLoginAt')
		.lean()

	if (!user) {
		throw new AdminAuthError('Người dùng không tìm thấy', 404)
	}

	// Chỉ cho phép staff roles
	const allowedRoles = ['admin', 'pharmacist', 'manager', 'sales_staff', 'warehouse_staff']
	if (!allowedRoles.includes(user.role)) {
		throw new AdminAuthError('Không có quyền truy cập', 403)
	}

	return {
		id: String(user._id),
		fullName: user.fullName,
		email: user.email,
		phone: user.phone || '',
		avatar: user.avatar || '',
		role: user.role,
		isActive: user.isActive,
		createdAt: user.createdAt,
		lastLoginAt: user.lastLoginAt,
	}
}

/**
 * Register admin/staff account - Tạo tài khoản admin/staff với chọn role
 */
const registerAdmin = async ({ fullName, email, phone, password, role }) => {
	// Validate input
	if (!fullName || !email || !phone || !password || !role) {
		throw new AdminAuthError('Tất cả các trường là bắt buộc', 400)
	}

	// Validate role
	const allowedRoles = ['admin', 'pharmacist', 'manager', 'sales_staff', 'warehouse_staff']
	if (!allowedRoles.includes(role)) {
		throw new AdminAuthError(`Vai trò không hợp lệ. Chỉ chấp nhận: ${allowedRoles.join(', ')}`, 400)
	}

	// Check if email exists
	const emailLower = email.toLowerCase().trim()
	const existingUser = await User.findOne({ email: emailLower })

	if (existingUser) {
		throw new AdminAuthError('Email này đã được đăng ký', 409)
	}

	// Check if phone exists
	const existingPhone = await User.findOne({ phone })

	if (existingPhone) {
		throw new AdminAuthError('Số điện thoại này đã được đăng ký', 409)
	}

	// Hash password
	const salt = await bcrypt.genSalt(10)
	const hashedPassword = await bcrypt.hash(password, salt)

	// Create new user
	const newUser = new User({
		fullName: fullName.trim(),
		email: emailLower,
		phone: phone.trim(),
		password: hashedPassword,
		role: role, // admin, pharmacist, manager, sales_staff, warehouse_staff
		provider: 'local',
		isActive: true,
	})

	await newUser.save()

	// Generate tokens
	const accessToken = jwt.sign(
		{ userId: String(newUser._id), role: newUser.role },
		getJwtSecret(),
		{ expiresIn: '7d' },
	)

	return {
		accessToken,
		user: {
			id: String(newUser._id),
			fullName: newUser.fullName,
			email: newUser.email,
			phone: newUser.phone,
			role: newUser.role,
		},
		expiresIn: '7d',
	}
}

module.exports = { loginAdmin, refreshAdminToken, getAdminProfile, registerAdmin, AdminAuthError }
