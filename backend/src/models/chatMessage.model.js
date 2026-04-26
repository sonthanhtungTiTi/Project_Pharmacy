const mongoose = require('mongoose')

const chatMessageSchema = new mongoose.Schema(
	{
		conversationId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'ChatConversation',
			required: true,
			index: true,
		},
		senderType: {
			type: String,
			enum: ['user', 'bot', 'admin', 'system'],
			required: true,
			index: true,
		},
		senderId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},
		senderName: {
			type: String,
			default: '',
			trim: true,
		},
		content: {
			type: String,
			required: true,
			trim: true,
		},
		intent: {
			type: String,
			default: '',
		},
		action: {
			type: String,
			default: '',
		},
		meta: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
	},
	{
		timestamps: true,
	},
)

chatMessageSchema.index({ conversationId: 1, createdAt: 1 })

module.exports = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema)
