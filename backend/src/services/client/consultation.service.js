const mongoose = require('mongoose')
const Consultation = require('../../models/consultation.model')
const User = require('../../models/user.model')

class ConsultationServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

const createConsultationCode = () => {
	const now = new Date()
	const pad = (value) => String(value).padStart(2, '0')
	const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
	const randomSuffix = Math.floor(1000 + Math.random() * 9000)
	return `CONS${timestamp}${randomSuffix}`
}

const serializeConsultation = (doc) => ({
	id: String(doc._id),
	consultationCode: doc.consultationCode,
	userId: String(doc.userId),
	fullName: doc.fullName,
	phone: doc.phone,
	email: doc.email,
	consultationDate: doc.consultationDate,
	consultationType: doc.consultationType,
	topic: doc.topic,
	description: doc.description || '',
	status: doc.status,
	offlineLocation: doc.offlineLocation || '',
	meetingLink: doc.meetingLink || '',
	note: doc.note || '',
	staffNote: doc.staffNote || '',
	assignedStaff: doc.assignedStaff ? String(doc.assignedStaff) : null,
	result: doc.result || '',
	confirmedAt: doc.confirmedAt || null,
	cancelledAt: doc.cancelledAt || null,
	cancellationReason: doc.cancellationReason || '',
	completedAt: doc.completedAt || null,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
})

const ensureValidObjectId = (value, fieldName) => {
	if (!mongoose.Types.ObjectId.isValid(value)) {
		throw new ConsultationServiceError(`${fieldName} is invalid`, 400)
	}
}

// Tạo lịch tư vấn
const createConsultation = async (userId, consultationData) => {
	ensureValidObjectId(userId, 'userId')

	// Kiểm tra ngày tư vấn không được trong quá khứ
	const consultationDate = new Date(consultationData.consultationDate)
	const now = new Date()
	if (consultationDate < now) {
		throw new ConsultationServiceError('Ngày tư vấn phải là tương lai', 400)
	}

	const consultation = new Consultation({
		consultationCode: createConsultationCode(),
		userId,
		fullName: consultationData.fullName,
		phone: consultationData.phone,
		email: consultationData.email,
		consultationDate,
		consultationType: consultationData.consultationType || 'online',
		topic: consultationData.topic,
		description: consultationData.description || '',
		offlineLocation: consultationData.offlineLocation || '',
		note: consultationData.note || '',
	})

	await consultation.save()
	return serializeConsultation(consultation)
}

// Lấy danh sách lịch tư vấn của user
const getMyConsultations = async (userId, { status, page = 1, limit = 10 } = {}) => {
	ensureValidObjectId(userId, 'userId')

	const numericPage = Math.max(1, Number(page) || 1)
	const numericLimit = Math.min(100, Math.max(1, Number(limit) || 10))
	const skip = (numericPage - 1) * numericLimit

	const filter = { userId }
	if (status) {
		filter.status = String(status)
	}

	const [consultations, total] = await Promise.all([
		Consultation.find(filter)
			.sort({ consultationDate: -1 })
			.skip(skip)
			.limit(numericLimit)
			.lean(),
		Consultation.countDocuments(filter),
	])

	return {
		items: consultations.map(serializeConsultation),
		pagination: {
			page: numericPage,
			limit: numericLimit,
			total,
			totalPages: Math.max(1, Math.ceil(total / numericLimit)),
		},
	}
}

// Lấy chi tiết lịch tư vấn
const getConsultationDetail = async (userId, consultationId) => {
	ensureValidObjectId(userId, 'userId')
	ensureValidObjectId(consultationId, 'consultationId')

	const consultation = await Consultation.findOne({
		_id: consultationId,
		userId,
	}).lean()

	if (!consultation) {
		throw new ConsultationServiceError('Lịch tư vấn không tìm thấy', 404)
	}

	return serializeConsultation(consultation)
}

// Hủy lịch tư vấn
const cancelConsultation = async (userId, consultationId, cancellationReason) => {
	ensureValidObjectId(userId, 'userId')
	ensureValidObjectId(consultationId, 'consultationId')

	const consultation = await Consultation.findOne({
		_id: consultationId,
		userId,
	})

	if (!consultation) {
		throw new ConsultationServiceError('Lịch tư vấn không tìm thấy', 404)
	}

	if (consultation.status === 'completed') {
		throw new ConsultationServiceError('Không thể hủy lịch tư vấn đã hoàn thành', 400)
	}

	if (consultation.status === 'cancelled') {
		throw new ConsultationServiceError('Lịch tư vấn đã bị hủy', 400)
	}

	// Kiểm tra nếu lịch tư vấn sắp tới < 1 giờ thì không cho hủy
	const now = new Date()
	const diff = consultation.consultationDate.getTime() - now.getTime()
	const hoursUntil = diff / (1000 * 60 * 60)

	if (hoursUntil < 1) {
		throw new ConsultationServiceError('Không thể hủy lịch tư vấn sắp tới (còn < 1 giờ)', 400)
	}

	consultation.status = 'cancelled'
	consultation.cancelledAt = new Date()
	consultation.cancellationReason = cancellationReason || ''

	await consultation.save()
	return serializeConsultation(consultation)
}

// [Admin/Staff] Cập nhật trạng thái lịch tư vấn
const updateConsultationStatus = async (consultationId, { status, cancellationReason, meetingLink }) => {
	ensureValidObjectId(consultationId, 'consultationId')

	const consultation = await Consultation.findById(consultationId)

	if (!consultation) {
		throw new ConsultationServiceError('Lịch tư vấn không tìm thấy', 404)
	}

	if (status === 'confirmed') {
		consultation.status = 'confirmed'
		consultation.confirmedAt = new Date()
		if (meetingLink) {
			consultation.meetingLink = meetingLink
		}
	} else if (status === 'cancelled') {
		consultation.status = 'cancelled'
		consultation.cancelledAt = new Date()
		consultation.cancellationReason = cancellationReason || ''
	} else if (status === 'completed') {
		consultation.status = 'completed'
		consultation.completedAt = new Date()
	}

	await consultation.save()
	return serializeConsultation(consultation)
}

// [Admin/Staff] Gán nhân viên tư vấn
const assignStaff = async (consultationId, staffId) => {
	ensureValidObjectId(consultationId, 'consultationId')
	ensureValidObjectId(staffId, 'staffId')

	const [consultation, staff] = await Promise.all([
		Consultation.findById(consultationId),
		User.findById(staffId),
	])

	if (!consultation) {
		throw new ConsultationServiceError('Lịch tư vấn không tìm thấy', 404)
	}

	if (!staff) {
		throw new ConsultationServiceError('Nhân viên không tìm thấy', 404)
	}

	consultation.assignedStaff = staffId
	await consultation.save()
	return serializeConsultation(consultation)
}

// [Admin] Lấy danh sách tất cả lịch tư vấn (cho admin dashboard)
const getAllConsultations = async ({ status, userId, page = 1, limit = 10 } = {}) => {
	const numericPage = Math.max(1, Number(page) || 1)
	const numericLimit = Math.min(100, Math.max(1, Number(limit) || 10))
	const skip = (numericPage - 1) * numericLimit

	const filter = {}
	if (status) {
		filter.status = String(status)
	}
	if (userId && mongoose.Types.ObjectId.isValid(userId)) {
		filter.userId = userId
	}

	const [consultations, total] = await Promise.all([
		Consultation.find(filter)
			.sort({ consultationDate: -1 })
			.skip(skip)
			.limit(numericLimit)
			.populate('userId', 'fullName email phone')
			.populate('assignedStaff', 'fullName email')
			.lean(),
		Consultation.countDocuments(filter),
	])

	return {
		items: consultations.map(serializeConsultation),
		pagination: {
			page: numericPage,
			limit: numericLimit,
			total,
			totalPages: Math.max(1, Math.ceil(total / numericLimit)),
		},
	}
}

// Lấy chi tiết lịch tư vấn theo consultation code
const getConsultationByCode = async (userId, consultationCode) => {
	ensureValidObjectId(userId, 'userId')

	const consultation = await Consultation.findOne({
		consultationCode: String(consultationCode).trim(),
		userId,
	}).lean()

	if (!consultation) {
		throw new ConsultationServiceError('Lịch tư vấn không tìm thấy', 404)
	}

	return serializeConsultation(consultation)
}

module.exports = {
	createConsultation,
	getMyConsultations,
	getConsultationDetail,
	getConsultationByCode,
	cancelConsultation,
	updateConsultationStatus,
	assignStaff,
	getAllConsultations,
}
