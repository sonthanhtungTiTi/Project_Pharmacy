const userService = require('../../services/admin/user.service')

const listUsers = async (req, res) => {
	try {
		const data = await userService.listUsers(req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Users fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch users failed',
		})
	}
}

const getUserDetail = async (req, res) => {
	try {
		const { userId } = req.params
		const data = await userService.getUserDetail(userId)

		return res.status(200).json({
			success: true,
			message: 'User fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch user failed',
		})
	}
}

const createUser = async (req, res) => {
	try {
		const data = await userService.createUser(req.body)

		return res.status(201).json({
			success: true,
			message: 'Tạo tài khoản thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Create user failed',
		})
	}
}

const updateUser = async (req, res) => {
	try {
		const { userId } = req.params
		const data = await userService.updateUser(userId, req.body)

		return res.status(200).json({
			success: true,
			message: 'Cập nhật thông tin thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Update user failed',
		})
	}
}

const updateUserRole = async (req, res) => {
	try {
		const { userId } = req.params
		const data = await userService.updateUserRole(userId, req.body)

		return res.status(200).json({
			success: true,
			message: 'Cập nhật quyền thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Update role failed',
		})
	}
}

const banUser = async (req, res) => {
	try {
		const { userId } = req.params
		const data = await userService.banUser(userId, req.body)

		return res.status(200).json({
			success: true,
			message: 'Đã vô hiệu hóa tài khoản',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Ban user failed',
		})
	}
}

const unbanUser = async (req, res) => {
	try {
		const { userId } = req.params
		const data = await userService.unbanUser(userId)

		return res.status(200).json({
			success: true,
			message: 'Đã khôi phục tài khoản',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Unban user failed',
		})
	}
}

const getUserStats = async (req, res) => {
	try {
		const data = await userService.getUserStats()

		return res.status(200).json({
			success: true,
			message: 'User stats fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch user stats failed',
		})
	}
}

module.exports = {
	listUsers,
	getUserDetail,
	createUser,
	updateUser,
	updateUserRole,
	banUser,
	unbanUser,
	getUserStats,
}
