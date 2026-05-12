const mongoose = require('mongoose')

const prescriptionRequestSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		productId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},
		prescriptionImage: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			enum: ['pending', 'approved', 'rejected', 'cancelled'],
			default: 'pending',
			index: true,
		},
		adminMessage: {
			type: String,
			default: '',
		},
		conversationId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'ChatConversation',
			default: null,
		},
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
	},
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('PrescriptionRequest', prescriptionRequestSchema)
