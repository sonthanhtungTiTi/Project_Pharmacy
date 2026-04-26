const mongoose = require('mongoose')

const otpSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		email: {
			type: String,
			required: true,
			lowercase: true,
			trim: true,
			index: true,
		},
		purpose: {
			type: String,
			enum: ['reset-password'],
			required: true,
		},
		otpHash: {
			type: String,
			required: true,
		},
		expiresAt: {
			type: Date,
			required: true,
		},
		attempts: {
			type: Number,
			default: 0,
		},
		verifiedAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
	},
)

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('Otp', otpSchema)
