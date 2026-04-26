const authService = require('../../services/admin/auth.service')

const login = async (req, res) => {
	try {
		const data = await authService.loginAdmin(req.body)

		return res.status(200).json({
			success: true,
			message: 'Đăng nhập thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Đăng nhập thất bại',
		})
	}
}

const refresh = async (req, res) => {
	try {
		const data = await authService.refreshAdminToken(req.auth.userId)

		return res.status(200).json({
			success: true,
			message: 'Token refreshed',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Refresh failed',
		})
	}
}

const getMe = async (req, res) => {
	try {
		const data = await authService.getAdminProfile(req.auth.userId)

		return res.status(200).json({
			success: true,
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch profile failed',
		})
	}
}

const logout = async (req, res) => {
	// JWT stateless — client chỉ cần xóa token ở localStorage
	return res.status(200).json({
		success: true,
		message: 'Đăng xuất thành công',
	})
}

const register = async (req, res) => {
	try {
		const data = await authService.registerAdmin(req.body)

		return res.status(201).json({
			success: true,
			message: 'Tài khoản đã được tạo thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Đăng ký thất bại',
		})
	}
}

module.exports = { login, refresh, getMe, logout, register }
