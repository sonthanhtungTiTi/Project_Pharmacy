const User = require('../../models/user.model')
const { computeDistance, isMatch } = require('../ai/face.service')
const jwt = require('jsonwebtoken')
const chatService = require('../chat/chat.service')

const createAccessToken = (user) => {
	const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me'
	return jwt.sign(
		{
			userId: user._id,
			email: user.email,
			role: user.role,
		},
		jwtSecret,
		{ expiresIn: '7d' }
	)
}

const sanitizeUser = (user) => ({
	id: user._id,
	fullName: user.fullName,
	email: user.email,
	phone: user.phone,
	avatar: user.avatar || '',
	isAvatarCustom: Boolean(user.isAvatarCustom),
	address: user.address || '',
	role: user.role,
	provider: user.provider,
	faceIdEnabled: user.faceIdEnabled,
})

/**
 * Đăng ký Face ID cho người dùng đã đăng nhập.
 * Nhận 3 vector từ Client gửi lên.
 * 
 * FIX 1: Cross-check 3 vector phải cùng 1 người trước khi lưu DB.
 * FIX 2: Ghi thêm metadata phiên bản mô hình (faceDescriptorVersion).
 */
const enrollFaceId = async (userId, faceDescriptors) => {
	const user = await User.findById(userId)
	if (!user) {
		const error = new Error('Không tìm thấy người dùng')
		error.statusCode = 404
		throw error
	}

	const [d0, d1, d2] = faceDescriptors

	// ─── FIX 1: Kiểm tra 3 ảnh phải thuộc cùng 1 người ───────────────────
	// Nếu bất kỳ 2 ảnh nào trong 3 ảnh quá khác nhau (dist > 0.55),
	// chứng tỏ có ảnh chụp trúng người khác → từ chối lưu vào DB.
	const d01 = computeDistance(d0, d1)
	const d02 = computeDistance(d0, d2)
	const d12 = computeDistance(d1, d2)

	if (d01 > 0.55 || d02 > 0.55 || d12 > 0.55) {
		console.warn(JSON.stringify({
			event: 'face_enroll_rejected',
			userId,
			reason: 'cross_check_failed',
			distances: { d01: +d01.toFixed(4), d02: +d02.toFixed(4), d12: +d12.toFixed(4) },
			timestamp: new Date().toISOString(),
		}))
		const error = new Error('Ba góc khuôn mặt không khớp cùng một người. Vui lòng chụp lại trong điều kiện ánh sáng tốt.')
		error.statusCode = 400
		throw error
	}
	// ──────────────────────────────────────────────────────────────────────

	// ─── FIX 2: Ghi metadata phiên bản mô hình ────────────────────────────
	// faceDescriptorVersion = 2 → dùng TinyFaceDetector (inputSize=416)
	// Tăng số này khi nâng cấp model trong tương lai để biết cần re-enroll.
	user.faceDescriptors = faceDescriptors
	user.faceIdEnabled = true
	user.faceIdEnrolledAt = new Date()
	user.faceDescriptorVersion = 2
	// ──────────────────────────────────────────────────────────────────────

	await user.save()

	console.log(JSON.stringify({
		event: 'face_enroll_success',
		userId,
		crossCheckDistances: { d01: +d01.toFixed(4), d02: +d02.toFixed(4), d12: +d12.toFixed(4) },
		timestamp: new Date().toISOString(),
	}))

	return true
}

/**
 * Vô hiệu hóa Face ID
 */
const disableFaceId = async (userId) => {
	const user = await User.findById(userId)
	if (!user) {
		const error = new Error('Không tìm thấy người dùng')
		error.statusCode = 404
		throw error
	}

	user.faceIdEnabled = false
	user.faceDescriptors = []
	user.faceIdEnrolledAt = null

	await user.save()
	return true
}

/**
 * Đăng nhập bằng Face ID.
 * Nhận 3 ảnh (thẳng, trái, phải) để chống giả mạo bằng ảnh tĩnh.
 * 
 * FIX 3: Tính confidence score + structured logging cho security audit.
 * FIX 4: Liveness check đầy đủ (min & max dist) để chặn ảnh tĩnh và ảnh không nhất quán.
 */
const loginWithFaceId = async (faceDescriptors) => {
	if (!faceDescriptors || faceDescriptors.length < 3) {
		const error = new Error('Cần 3 vector khuôn mặt để xác thực liveness')
		error.statusCode = 400
		throw error
	}

	const loginDescriptors = faceDescriptors

	// ─── FIX 4: ANTI-SPOOFING – Kiểm tra Liveness đầy đủ ────────────────
	const distStraightLeft  = computeDistance(loginDescriptors[0], loginDescriptors[1])
	const distStraightRight = computeDistance(loginDescriptors[0], loginDescriptors[2])
	const distLeftRight     = computeDistance(loginDescriptors[1], loginDescriptors[2])

	const livenessDistances = [distStraightLeft, distStraightRight, distLeftRight]
	const minLivenessDist = Math.min(...livenessDistances)
	const maxLivenessDist = Math.max(...livenessDistances)

	// Kiểm tra 1: 3 ảnh quá giống nhau → kẻ gian dùng ảnh tĩnh/video đóng băng
	if (minLivenessDist < 0.18) {
		const error = new Error('Phát hiện ảnh tĩnh. Vui lòng sử dụng khuôn mặt thật để đăng nhập.')
		error.statusCode = 401
		throw error
	}

	// Kiểm tra 2: 3 ảnh quá khác nhau → không cùng 1 người (camera bị che, hoặc người khác xuất hiện)
	if (maxLivenessDist > 0.55) {
		const error = new Error('Ảnh khuôn mặt không nhất quán. Vui lòng thử lại.')
		error.statusCode = 400
		throw error
	}
	// ──────────────────────────────────────────────────────────────────────

	// Lấy toàn bộ người dùng có kích hoạt Face ID
	const users = await User.find({ faceIdEnabled: true }).select('+faceDescriptors')
	if (!users || users.length === 0) {
		const error = new Error('Chưa có tài khoản nào đăng ký Face ID trong hệ thống')
		error.statusCode = 404
		throw error
	}

	let matchedUser = null
	let bestAvgDist = Infinity

	// ─── CROSS-CHECK 1:N – So khớp ảnh login với TẤT CẢ ảnh trong DB ──
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
	}

		if (allFound) {
			const avgDist = totalBestDist / loginDescriptors.length
			// Nếu tìm thấy một người có độ khớp tốt hơn thì cập nhật
			if (avgDist < bestAvgDist) {
				bestAvgDist = avgDist
				matchedUser = user
			}
		}
	}

	// ─── FIX 3: Confidence scoring + structured logging ───────────────────
	let confidence
	if (bestAvgDist <= 0.40) confidence = 'high'
	else if (bestAvgDist <= 0.55) confidence = 'marginal'
	else confidence = 'fail'

	console.log(JSON.stringify({
		event: 'face_login_attempt',
		matchedUserId: matchedUser ? matchedUser._id : null,
		bestAvgDist: +bestAvgDist.toFixed(4),
		confidence,
		liveness: {
			minDist: +minLivenessDist.toFixed(4),
			maxDist: +maxLivenessDist.toFixed(4),
		},
		timestamp: new Date().toISOString(),
	}))
	// ──────────────────────────────────────────────────────────────────────

	if (!matchedUser || confidence === 'fail') {
		const error = new Error('Khuôn mặt không khớp với bất kỳ tài khoản nào. Vui lòng thử lại.')
		error.statusCode = 401
		throw error
	}

	matchedUser.lastLoginAt = new Date()
	await matchedUser.save()

	// Clear old chat history upon new login session
	await chatService.clearClientChat(matchedUser._id)

	return {
		accessToken: createAccessToken(matchedUser),
		user: sanitizeUser(matchedUser),
		// Trả confidence về FE để FE có thể hiển thị cảnh báo nếu là 'marginal'
		faceConfidence: confidence,
	}
}

module.exports = {
	enrollFaceId,
	disableFaceId,
	loginWithFaceId,
}
