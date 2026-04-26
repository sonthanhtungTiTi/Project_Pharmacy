const consultationService = require('../../services/client/consultation.service')

// [Admin/Staff] Lấy danh sách tất cả consultations
const getAllConsultations = async (req, res) => {
	try {
		const { status, userId, page, limit } = req.query
		const data = await consultationService.getAllConsultations({
			status,
			userId,
			page,
			limit,
		})

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

// [Admin] Cập nhật trạng thái consultation
const updateConsultationStatus = async (req, res) => {
	try {
		const { consultationId } = req.params
		const { status, cancellationReason, meetingLink } = req.body

		const data = await consultationService.updateConsultationStatus(consultationId, {
			status,
			cancellationReason,
			meetingLink,
		})

		return res.status(200).json({
			success: true,
			message: 'Cập nhật trạng thái lịch tư vấn thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Cập nhật trạng thái thất bại',
			error: error.message,
		})
	}
}

// [Admin] Gán nhân viên tư vấn
const assignStaffToConsultation = async (req, res) => {
	try {
		const { consultationId } = req.params
		const { staffId } = req.body

		if (!staffId) {
			return res.status(400).json({
				success: false,
				message: 'staffId là bắt buộc',
			})
		}

		const data = await consultationService.assignStaff(consultationId, staffId)

		return res.status(200).json({
			success: true,
			message: 'Gán nhân viên tư vấn thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Gán nhân viên thất bại',
			error: error.message,
		})
	}
}

// [Admin] Dashboard - Thống kê consultations
const getConsultationStats = async (req, res) => {
	try {
		const Consultation = require('../../models/consultation.model')

		const [totalPending, totalConfirmed, totalCompleted, totalCancelled, todayConsultations] = await Promise.all([
			Consultation.countDocuments({ status: 'pending' }),
			Consultation.countDocuments({ status: 'confirmed' }),
			Consultation.countDocuments({ status: 'completed' }),
			Consultation.countDocuments({ status: 'cancelled' }),
			Consultation.countDocuments({
				consultationDate: {
					$gte: new Date(new Date().setHours(0, 0, 0, 0)),
					$lt: new Date(new Date().setHours(24, 0, 0, 0)),
				},
			}),
		])

		const data = {
			summary: {
				totalPending,
				totalConfirmed,
				totalCompleted,
				totalCancelled,
				todayConsultations,
			},
			timestamp: new Date(),
		}

		return res.status(200).json({
			success: true,
			message: 'Thống kê lịch tư vấn',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Lấy thống kê thất bại',
			error: error.message,
		})
	}
}

// [Admin] Lấy consultations sắp tới (trong 24h)
const getUpcomingConsultations = async (req, res) => {
	try {
		const Consultation = require('../../models/consultation.model')

		const now = new Date()
		const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

		const consultations = await Consultation.find({
			consultationDate: {
				$gte: now,
				$lte: tomorrow,
			},
			status: { $in: ['pending', 'confirmed'] },
		})
			.populate('userId', 'fullName email phone')
			.populate('assignedStaff', 'fullName email')
			.sort({ consultationDate: 1 })
			.lean()

		const serializeConsultation = (doc) => ({
			id: String(doc._id),
			consultationCode: doc.consultationCode,
			userId: String(doc.userId._id),
			userInfo: {
				id: String(doc.userId._id),
				fullName: doc.userId.fullName,
				email: doc.userId.email,
				phone: doc.userId.phone,
			},
			consultationDate: doc.consultationDate,
			consultationType: doc.consultationType,
			topic: doc.topic,
			status: doc.status,
			assignedStaff: doc.assignedStaff
				? {
						id: String(doc.assignedStaff._id),
						fullName: doc.assignedStaff.fullName,
						email: doc.assignedStaff.email,
					}
				: null,
			meetingLink: doc.meetingLink || '',
		})

		const data = {
			items: consultations.map(serializeConsultation),
			count: consultations.length,
		}

		return res.status(200).json({
			success: true,
			message: 'Danh sách lịch tư vấn sắp tới',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Lấy danh sách lịch tư vấn sắp tới thất bại',
			error: error.message,
		})
	}
}

// [Staff] Lấy danh sách consultations được gán cho staff
const getStaffConsultations = async (req, res) => {
	try {
		const staffId = req.user?.userId
		const Consultation = require('../../models/consultation.model')

		const { status, page = 1, limit = 10 } = req.query
		const numericPage = Math.max(1, Number(page) || 1)
		const numericLimit = Math.min(100, Math.max(1, Number(limit) || 10))
		const skip = (numericPage - 1) * numericLimit

		const filter = {
			assignedStaff: staffId,
		}
		if (status) {
			filter.status = String(status)
		}

		const [consultations, total] = await Promise.all([
			Consultation.find(filter)
				.populate('userId', 'fullName email phone')
				.sort({ consultationDate: -1 })
				.skip(skip)
				.limit(numericLimit)
				.lean(),
			Consultation.countDocuments(filter),
		])

		const serializeConsultation = (doc) => ({
			id: String(doc._id),
			consultationCode: doc.consultationCode,
			userInfo: {
				id: String(doc.userId._id),
				fullName: doc.userId.fullName,
				email: doc.userId.email,
				phone: doc.userId.phone,
			},
			consultationDate: doc.consultationDate,
			consultationType: doc.consultationType,
			topic: doc.topic,
			status: doc.status,
			meetingLink: doc.meetingLink || '',
			description: doc.description || '',
			staffNote: doc.staffNote || '',
		})

		const data = {
			items: consultations.map(serializeConsultation),
			pagination: {
				page: numericPage,
				limit: numericLimit,
				total,
				totalPages: Math.max(1, Math.ceil(total / numericLimit)),
			},
		}

		return res.status(200).json({
			success: true,
			message: 'Danh sách lịch tư vấn của staff',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Lấy danh sách thất bại',
			error: error.message,
		})
	}
}

// [Staff] Cập nhật ghi chú (staffNote) sau khi tư vấn
const updateStaffNote = async (req, res) => {
	try {
		const { consultationId } = req.params
		const { staffNote } = req.body
		const Consultation = require('../../models/consultation.model')

		const consultation = await Consultation.findById(consultationId)
		if (!consultation) {
			return res.status(404).json({
				success: false,
				message: 'Lịch tư vấn không tìm thấy',
			})
		}

		consultation.staffNote = staffNote || ''
		await consultation.save()

		return res.status(200).json({
			success: true,
			message: 'Cập nhật ghi chú thành công',
			data: { id: String(consultation._id), staffNote: consultation.staffNote },
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Cập nhật ghi chú thất bại',
			error: error.message,
		})
	}
}

module.exports = {
	getAllConsultations,
	updateConsultationStatus,
	assignStaffToConsultation,
	getConsultationStats,
	getUpcomingConsultations,
	getStaffConsultations,
	updateStaffNote,
}
