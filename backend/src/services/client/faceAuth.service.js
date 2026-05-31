const User = require('../../models/user.model')
const { extractDescriptor, computeDistance, isMatch } = require('../ai/face.service')
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
 * 
 * FIX 1: Cross-check 3 ảnh phải cùng 1 người trước khi lưu DB.
 * FIX 2: Ghi thêm metadata phiên bản mô hình (faceDescriptorVersion).
 */
const enrollFaceId = async (userId, imageBuffers) => {
	const user = await User.findById(userId)
	if (!user) {
		const error = new Error('Không tìm thấy người dùng')
		error.statusCode = 404
		throw error
	}

	// Trích xuất 3 vector 128 chiều song song để tối ưu tốc độ
	const descriptorsArrays = await Promise.all(
		imageBuffers.map((buffer) => extractDescriptor(buffer))
	)
	const descriptors = descriptorsArrays.map((desc) => Array.from(desc))
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
		const error = new Error('Ba ảnh không khớp với cùng một người. Vui lòng chụp lại trong điều kiện ánh sáng tốt.')
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
const loginWithFaceId = async (identity, imageBuffers) => {
	if (!identity) {
		const error = new Error('Yêu cầu email hoặc số điện thoại để xác thực')
		error.statusCode = 400
		throw error
	}

	if (!imageBuffers || imageBuffers.length < 3) {
		const error = new Error('Cần 3 ảnh để xác thực liveness')
		error.statusCode = 400
		throw error
	}

	// 1:1 Authentication: Chỉ truy vấn đúng user đó
	const identityQuery = identity.includes('@')
		? { email: identity.toLowerCase() }
		: { phone: identity }

	const user = await User.findOne({ ...identityQuery, faceIdEnabled: true }).select('+faceDescriptors')
	if (!user || !user.faceDescriptors || user.faceDescriptors.length === 0) {
		const error = new Error('Tài khoản chưa đăng ký Face ID hoặc không tồn tại')
		error.statusCode = 404
		throw error
	}

	// Trích xuất 3 vector từ 3 ảnh login (chạy song song)
	const loginDescriptorsArrays = await Promise.all(
		imageBuffers.map((buf) => extractDescriptor(buf))
	)
	const loginDescriptors = loginDescriptorsArrays.map((desc) => Array.from(desc))

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
			userId: user._id,
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
			userId: user._id,
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
	// Lấy khoảng cách ngắn nhất (best match) của từng ảnh login với DB
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

	// ─── FIX 3: Confidence scoring + structured logging ───────────────────
	const avgDist = allFound ? totalBestDist / loginDescriptors.length : 1.0

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

	if (!allFound || confidence === 'fail') {
		const error = new Error('Khuôn mặt không khớp. Vui lòng thử lại.')
		error.statusCode = 401
		throw error
	}

	user.lastLoginAt = new Date()
	await user.save()

	// Clear old chat history upon new login session
	await chatService.clearClientChat(user._id)

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
