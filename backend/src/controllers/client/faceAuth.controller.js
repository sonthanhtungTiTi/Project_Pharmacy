const faceAuthService = require('../../services/client/faceAuth.service')

const enrollFaceId = async (req, res) => {
	try {
		const userId = req.auth.userId
		const { faceDescriptors } = req.body

		if (!faceDescriptors || faceDescriptors.length === 0) {
			return res.status(400).json({ 
				success: false, 
				message: 'Vui lòng cung cấp dữ liệu khuôn mặt' 
			})
		}

		await faceAuthService.enrollFaceId(userId, faceDescriptors)

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
		const { email, faceDescriptors } = req.body

		if (!email) {
			return res.status(400).json({
				success: false,
				message: 'Vui lòng cung cấp email hoặc số điện thoại'
			})
		}

		if (!faceDescriptors || faceDescriptors.length < 3) {
			return res.status(400).json({ 
				success: false, 
				message: 'Vui lòng cung cấp đủ 3 góc khuôn mặt (thẳng, trái, phải)' 
			})
		}

		const data = await faceAuthService.loginWithFaceId(email, faceDescriptors)

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
