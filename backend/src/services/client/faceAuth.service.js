const User = require('../../models/user.model')
const { computeDistance, isMatch } = require('../ai/face.service')
const jwt = require('jsonwebtoken')

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
const enrollFaceId = async (userId, descriptors) => {
	const user = await User.findById(userId)
	if (!user) {
		const error = new Error('Không tìm thấy người dùng')
		error.statusCode = 404
		throw error
	}

	if (!descriptors || descriptors.length < 3) {
		const error = new Error('Cần cung cấp đủ 3 góc khuôn mặt')
		error.statusCode = 400
		throw error
	}

	const [d0, d1, d2] = descriptors

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
	user.faceDescriptors = descriptors
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
const loginWithFaceId = async (descriptors) => {
	if (!descriptors || descriptors.length < 3) {
		const error = new Error('Cần 3 vector khuôn mặt để xác thực liveness')
		error.statusCode = 400
		throw error
	}

	const loginDescriptors = descriptors

	// ─── FIX 4: ANTI-SPOOFING – Kiểm tra Liveness đầy đủ ────────────────
	const distStraightLeft  = computeDistance(loginDescriptors[0], loginDescriptors[1])
	const distStraightRight = computeDistance(loginDescriptors[0], loginDescriptors[2])
	const distLeftRight     = computeDistance(loginDescriptors[1], loginDescriptors[2])

	const livenessDistances = [distStraightLeft, distStraightRight, distLeftRight]
	const minLivenessDist = Math.min(...livenessDistances)
	const maxLivenessDist = Math.max(...livenessDistances)

	// Kiểm tra 1: 3 ảnh quá giống nhau → kẻ gian dùng ảnh tĩnh/video đóng băng
	if (minLivenessDist < 0.18) {
		console.warn(JSON.stringify({
			event: 'face_login_rejected',
			reason: 'liveness_static_image',
			minLivenessDist: +minLivenessDist.toFixed(4),
			timestamp: new Date().toISOString(),
		}))
		const error = new Error('Phát hiện ảnh tĩnh. Vui lòng sử dụng khuôn mặt thật để đăng nhập.')
		error.statusCode = 401
		throw error
	}

	// Kiểm tra 2: 3 ảnh quá khác nhau → không cùng 1 người (camera bị che, hoặc người khác xuất hiện)
	if (maxLivenessDist > 0.55) {
		console.warn(JSON.stringify({
			event: 'face_login_rejected',
			reason: 'liveness_inconsistent_faces',
			maxLivenessDist: +maxLivenessDist.toFixed(4),
			timestamp: new Date().toISOString(),
		}))
		const error = new Error('Ảnh khuôn mặt không nhất quán. Vui lòng thử lại.')
		error.statusCode = 400
		throw error
	}
	// ──────────────────────────────────────────────────────────────────────

	// ─── CROSS-CHECK 1:N – So khớp mỗi ảnh login với TẤT CẢ ảnh trong DB ──
	const users = await User.find({ faceIdEnabled: true }).select('+faceDescriptors')
	
	let matchedUser = null
	let bestAvgDist = Infinity

	for (const u of users) {
		if (!u.faceDescriptors || u.faceDescriptors.length === 0) continue

		let totalBestDist = 0
		let allFound = true

		for (const loginDesc of loginDescriptors) {
			let minDistForThisDesc = Infinity
			for (const storedDesc of u.faceDescriptors) {
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
				matchedUser = u
			}
		}
	}

	if (!matchedUser) {
		const error = new Error('Khuôn mặt không khớp. Vui lòng thử lại.')
		error.statusCode = 401
		throw error
	}

	const user = matchedUser
	const avgDist = bestAvgDist

	// ─── FIX 3: Confidence scoring + structured logging ───────────────────
	let confidence
	if (avgDist <= 0.40) confidence = 'high'
	else if (avgDist <= 0.55) confidence = 'marginal'
	else confidence = 'fail'

	console.log(JSON.stringify({
		event: 'face_login_attempt',
		userId: user._id,
		avgDist: +avgDist.toFixed(4),
		confidence,
		liveness: {
			minDist: +minLivenessDist.toFixed(4),
			maxDist: +maxLivenessDist.toFixed(4),
		},
		timestamp: new Date().toISOString(),
	}))
	// ──────────────────────────────────────────────────────────────────────

	if (confidence === 'fail') {
		const error = new Error('Khuôn mặt không khớp. Vui lòng thử lại.')
		error.statusCode = 401
		throw error
	}

	// Cập nhật thời gian login
	user.lastLoginAt = new Date()
	await user.save()

	return {
		accessToken: createAccessToken(user),
		user: sanitizeUser(user),
		// Trả confidence về FE để FE có thể hiển thị cảnh báo nếu là 'marginal'
		faceConfidence: confidence,
	}
}

module.exports = {
	enrollFaceId,
	disableFaceId,
	loginWithFaceId,
}
