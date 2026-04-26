const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		label: {
			type: String,
			enum: ['home', 'office', 'other'],
			default: 'other',
		},
		recipientName: {
			type: String,
			required: true,
			trim: true,
		},
		phone: {
			type: String,
			required: true,
			trim: true,
		},
		provinceCode: {
			type: String,
			default: '',
			trim: true,
		},
		provinceName: {
			type: String,
			required: true,
			trim: true,
		},
		districtCode: {
			type: String,
			default: '',
			trim: true,
		},
		districtName: {
			type: String,
			required: true,
			trim: true,
		},
		wardCode: {
			type: String,
			default: '',
			trim: true,
		},
		wardName: {
			type: String,
			required: true,
			trim: true,
		},
		street: {
			type: String,
			required: true,
			trim: true,
		},
		note: {
			type: String,
			default: '',
			trim: true,
		},
		isDefault: {
			type: Boolean,
			default: false,
			index: true,
		},
	},
	{
		timestamps: true,
	},
)

addressSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.models.Address || mongoose.model('Address', addressSchema)
