const faceAuthService = require('../../services/client/faceAuth.service')

const enrollFaceId = async (req, res) => {
	try {
		const userId = req.auth.userId
		const files = req.files

		if (!files || files.length === 0) {
			return res.status(400).json({ 
				success: false, 
				message: 'Vui lòng cung cấp hình ảnh khuôn mặt' 
			})
		}

		const imageBuffers = files.map(file => file.buffer)
		await faceAuthService.enrollFaceId(userId, imageBuffers)

		return res.status(200).json({
			success: true,
			message: 'Đăng ký Face ID thành công'
		})
	} catch (error) {
		const statusCode = error.statusCode || 500
		return res.status(statusCode).json({
			success: false,
			message: error.message || 'Lỗi khi đăng ký Face ID',
			error: error.message
		})
	}
}

const disableFaceId = async (req, res) => {
	try {
		const userId = req.auth.userId
		await faceAuthService.disableFaceId(userId)

		return res.status(200).json({
			success: true,
			message: 'Đã vô hiệu hóa Face ID thành công'
		})
	} catch (error) {
		const statusCode = error.statusCode || 500
		return res.status(statusCode).json({
			success: false,
			message: error.message || 'Lỗi khi vô hiệu hóa Face ID',
			error: error.message
		})
	}
}

const loginWithFaceId = async (req, res) => {
	try {
		const files = req.files
		const { email } = req.body

		if (!email) {
			return res.status(400).json({
				success: false,
				message: 'Vui lòng cung cấp email hoặc số điện thoại'
			})
		}

		if (!files || files.length < 3) {
			return res.status(400).json({ 
				success: false, 
				message: 'Vui lòng cung cấp đủ 3 ảnh khuôn mặt (thẳng, trái, phải)' 
			})
		}

		const imageBuffers = files.map(file => file.buffer)
		const data = await faceAuthService.loginWithFaceId(email, imageBuffers)

		return res.status(200).json({
			success: true,
			message: 'Đăng nhập thành công',
			data
		})
	} catch (error) {
		const statusCode = error.statusCode || 500
		return res.status(statusCode).json({
			success: false,
			message: error.message || 'Lỗi khi đăng nhập bằng Face ID',
			error: error.message
		})
	}
}

module.exports = {
	enrollFaceId,
	disableFaceId,
	loginWithFaceId
}
