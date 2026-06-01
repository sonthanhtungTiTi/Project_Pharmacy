const User = require('../../models/user.model')
const { computeDistance, isMatch } = require('../ai/face.service')
const jwt = require('jsonwebtoken')
const { AdminAuthError } = require('./auth.service')

const getJwtSecret = () => process.env.JWT_SECRET || 'dev-secret-change-me'

// Cho phép staff roles
const allowedRoles = ['admin', 'pharmacist', 'manager', 'sales_staff', 'warehouse_staff']

const enrollFaceId = async (userId, faceDescriptors) => {
	const user = await User.findById(userId)
	if (!user) {
		throw new AdminAuthError('Không tìm thấy người dùng', 404)
	}

	if (!allowedRoles.includes(user.role)) {
		throw new AdminAuthError('Không có quyền sử dụng tính năng này', 403)
	}

	const [d0, d1, d2] = faceDescriptors

	const distStraightLeft  = computeDistance(d0, d1)
	const distStraightRight = computeDistance(d0, d2)
	const distLeftRight     = computeDistance(d1, d2)

	const livenessDistances = [distStraightLeft, distStraightRight, distLeftRight]
	const minDist = Math.min(...livenessDistances)
	const maxDist = Math.max(...livenessDistances)

	if (maxDist > 0.55) {
		throw new AdminAuthError('Ảnh khuôn mặt ở 3 góc quá khác nhau. Vui lòng đảm bảo cùng 1 người thực hiện.', 400)
	}
	if (minDist < 0.18) {
		throw new AdminAuthError('Phát hiện ảnh tĩnh/giả mạo. Vui lòng sử dụng khuôn mặt thật.', 400)
	}

	user.faceDescriptors = faceDescriptors
	user.faceIdEnabled = true
	user.faceIdEnrolledAt = new Date()
	user.faceDescriptorVersion = 2

	await user.save()

	return true
}

const disableFaceId = async (userId) => {
	const user = await User.findById(userId)
	if (!user) {
		throw new AdminAuthError('Không tìm thấy người dùng', 404)
	}

	user.faceIdEnabled = false
	user.faceDescriptors = []
	await user.save()

	return true
}

const loginWithFaceId = async (faceDescriptors) => {
	if (!faceDescriptors || faceDescriptors.length < 3) {
		throw new AdminAuthError('Cần 3 vector khuôn mặt để xác thực liveness', 400)
	}

	const loginDescriptors = faceDescriptors

	const distStraightLeft  = computeDistance(loginDescriptors[0], loginDescriptors[1])
	const distStraightRight = computeDistance(loginDescriptors[0], loginDescriptors[2])
	const distLeftRight     = computeDistance(loginDescriptors[1], loginDescriptors[2])

	const livenessDistances = [distStraightLeft, distStraightRight, distLeftRight]
	const minLivenessDist = Math.min(...livenessDistances)
	const maxLivenessDist = Math.max(...livenessDistances)

	if (minLivenessDist < 0.18) {
		throw new AdminAuthError('Phát hiện ảnh tĩnh. Vui lòng sử dụng khuôn mặt thật để đăng nhập.', 401)
	}

	if (maxLivenessDist > 0.55) {
		throw new AdminAuthError('Ảnh khuôn mặt không nhất quán. Vui lòng thử lại.', 400)
	}

	// Lấy tất cả user có kích hoạt Face ID và CÓ QUYỀN TRUY CẬP (role in allowedRoles)
	const users = await User.find({ faceIdEnabled: true, role: { $in: allowedRoles } }).select('+faceDescriptors')
	if (!users || users.length === 0) {
		throw new AdminAuthError('Chưa có tài khoản admin/staff nào đăng ký Face ID trong hệ thống', 404)
	}

	let matchedUser = null
	let bestAvgDist = Infinity

	for (const user of users) {
		if (!user.faceDescriptors || user.faceDescriptors.length === 0) continue

		let totalBestDist = 0
		let allFound = true

		for (const loginDesc of loginDescriptors) {
			let minDistForThisDesc = Infinity
			for (const storedDesc of user.faceDescriptors) {
				const d = computeDistance(loginDesc, storedDesc)
				if (d < minDistForThisDesc) minDistForThisDesc = d
			}

			if (!isMatch(minDistForThisDesc)) {
				allFound = false
				break
			}
			totalBestDist += minDistForThisDesc
		}

		if (allFound) {
			const avgDist = totalBestDist / loginDescriptors.length
			if (avgDist < bestAvgDist) {
				bestAvgDist = avgDist
				matchedUser = user
			}
		}
	}

	let confidence
	if (bestAvgDist <= 0.40) confidence = 'high'
	else if (bestAvgDist <= 0.55) confidence = 'marginal'
	else confidence = 'fail'

	console.log(JSON.stringify({
		event: 'admin_face_login_attempt',
		matchedUserId: matchedUser ? matchedUser._id : null,
		bestAvgDist: +bestAvgDist.toFixed(4),
		confidence,
		liveness: {
			minDist: +minLivenessDist.toFixed(4),
			maxDist: +maxLivenessDist.toFixed(4),
		},
		timestamp: new Date().toISOString(),
	}))

	if (!matchedUser || confidence === 'fail') {
		throw new AdminAuthError('Khuôn mặt không khớp với bất kỳ tài khoản admin/staff nào. Vui lòng thử lại.', 401)
	}

	if (matchedUser.isActive === false) {
		throw new AdminAuthError('Tài khoản đã bị vô hiệu hóa', 403)
	}

	matchedUser.lastLoginAt = new Date()
	await matchedUser.save()

	const accessToken = jwt.sign(
		{ userId: String(matchedUser._id), role: matchedUser.role },
		getJwtSecret(),
		{ expiresIn: '7d' }
	)

	return {
		accessToken,
		user: {
			id: String(matchedUser._id),
			fullName: matchedUser.fullName,
			email: matchedUser.email,
			phone: matchedUser.phone || '',
			avatar: matchedUser.avatar || '',
			role: matchedUser.role,
		},
		expiresIn: '7d',
		faceConfidence: confidence,
	}
}

module.exports = {
	enrollFaceId,
	disableFaceId,
	loginWithFaceId
}
