const express = require('express')
const User = require('../../models/user.model')
const { onlineUsers } = require('../../sockets/callHandler')

const router = express.Router()

/**
 * GET /api/client/staff/available
 * Trả về danh sách nhân viên (pharmacist, admin, manager) đang online
 * Client sử dụng API này để hiển thị danh sách người có thể gọi
 */
router.get('/available', async (req, res) => {
	try {
		// Lấy tất cả nhân viên có role phù hợp và đang active
		const staffRoles = ['pharmacist', 'admin', 'manager', 'sales_staff']
		const staffUsers = await User.find(
			{ role: { $in: staffRoles }, isActive: true },
			{ password: 0, googleId: 0, __v: 0 }
		).lean()

		// Lọc ra những user đang online (có trong onlineUsers Map)
		const result = staffUsers.map((staff) => {
			const staffId = staff._id.toString()
			const isOnline = onlineUsers.has(staffId)
			return {
				_id: staffId,
				fullName: staff.fullName,
				email: staff.email,
				avatar: staff.avatar || '',
				role: staff.role,
				department: staff.department || null,
				isOnline,
			}
		})

		// Sắp xếp: online trước, offline sau
		result.sort((a, b) => {
			if (a.isOnline && !b.isOnline) return -1
			if (!a.isOnline && b.isOnline) return 1
			return 0
		})

		res.json({
			success: true,
			data: result,
		})
	} catch (error) {
		console.error('[Staff] Error fetching available staff:', error)
		res.status(500).json({
			success: false,
			message: 'Không thể tải danh sách nhân viên',
		})
	}
})

module.exports = router
