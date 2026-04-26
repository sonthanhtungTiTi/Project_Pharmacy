const mongoose = require('mongoose')

const consultationSchema = new mongoose.Schema(
	{
		consultationCode: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		fullName: {
			type: String,
			required: true,
			trim: true,
		},
		phone: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			lowercase: true,
			trim: true,
		},
		// Thời gian tư vấn
		consultationDate: {
			type: Date,
			required: true,
			index: true,
		},
		// Loại tư vấn: online, offline, phone
		consultationType: {
			type: String,
			enum: ['online', 'offline', 'phone'],
			default: 'online',
		},
		// Chủ đề/Vấn đề cần tư vấn
		topic: {
			type: String,
			required: true,
			trim: true,
		},
		// Mô tả chi tiết
		description: {
			type: String,
			default: '',
			trim: true,
		},
		// Trạng thái: pending, confirmed, cancelled, completed
		status: {
			type: String,
			enum: ['pending', 'confirmed', 'cancelled', 'completed'],
			default: 'pending',
			index: true,
		},
		// Nếu là offline: địa chỉ chi nhánh
		offlineLocation: {
			type: String,
			default: '',
			trim: true,
		},
		// Link Zoom/Google Meet cho online
		meetingLink: {
			type: String,
			default: '',
			trim: true,
		},
		// Ghi chú từ khách hàng
		note: {
			type: String,
			default: '',
			trim: true,
		},
		// Ghi chú từ staff (nội bộ)
		staffNote: {
			type: String,
			default: '',
			trim: true,
		},
		// Người tư vấn (staff)
		assignedStaff: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},
		// Kết quả tư vấn
		result: {
			type: String,
			default: '',
			trim: true,
		},
		// Thời gian xác nhận
		confirmedAt: {
			type: Date,
			default: null,
		},
		// Thời gian hủy
		cancelledAt: {
			type: Date,
			default: null,
		},
		// Lý do hủy
		cancellationReason: {
			type: String,
			default: '',
			trim: true,
		},
		// Thời gian hoàn thành
		completedAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	},
)

// Index cho query tìm kiếm nhanh
consultationSchema.index({ userId: 1, consultationDate: -1 })
consultationSchema.index({ userId: 1, status: 1 })
consultationSchema.index({ consultationDate: 1 })

module.exports = mongoose.model('Consultation', consultationSchema)
