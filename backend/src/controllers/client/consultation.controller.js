const consultationService = require('../../services/client/consultation.service')

const createConsultation = async (req, res) => {
	try {
		const userId = req.user?.userId
		const data = await consultationService.createConsultation(userId, req.body || {})

		return res.status(201).json({
			success: true,
			message: 'Lịch tư vấn đã được tạo thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Tạo lịch tư vấn thất bại',
			error: error.message,
		})
	}
}

const getMyConsultations = async (req, res) => {
	try {
		const userId = req.user?.userId
		const data = await consultationService.getMyConsultations(userId, req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Danh sách lịch tư vấn được tải thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Lấy danh sách lịch tư vấn thất bại',
			error: error.message,
		})
	}
}

const getConsultationDetail = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { consultationId } = req.params
		const data = await consultationService.getConsultationDetail(userId, consultationId)

		return res.status(200).json({
			success: true,
			message: 'Chi tiết lịch tư vấn được tải thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Lấy chi tiết lịch tư vấn thất bại',
			error: error.message,
		})
	}
}

const getConsultationByCode = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { consultationCode } = req.params
		const data = await consultationService.getConsultationByCode(userId, consultationCode)

		return res.status(200).json({
			success: true,
			message: 'Chi tiết lịch tư vấn được tải thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Lấy chi tiết lịch tư vấn thất bại',
			error: error.message,
		})
	}
}

const cancelConsultation = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { consultationId } = req.params
		const { cancellationReason } = req.body
		const data = await consultationService.cancelConsultation(userId, consultationId, cancellationReason)

		return res.status(200).json({
			success: true,
			message: 'Lịch tư vấn đã được hủy thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Hủy lịch tư vấn thất bại',
			error: error.message,
		})
	}
}

module.exports = {
	createConsultation,
	getMyConsultations,
	getConsultationDetail,
	getConsultationByCode,
	cancelConsultation,
}
