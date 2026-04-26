const mongoose = require('mongoose')

const chatConversationSchema = new mongoose.Schema(
	{
		sessionId: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		clientId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		status: {
			type: String,
			enum: ['ai', 'human_pending', 'human', 'closed'],
			default: 'ai',
			index: true,
		},
		assignedStaffId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
			index: true,
		},
		lastIntent: {
			type: String,
			default: 'GENERAL_FAQ',
		},
		lastAction: {
			type: String,
			default: 'GENERAL_FAQ',
		},
		lastMessageAt: {
			type: Date,
			default: Date.now,
			index: true,
		},
		unreadForClient: {
			type: Number,
			default: 0,
			min: 0,
		},
		unreadForAdmin: {
			type: Number,
			default: 0,
			min: 0,
		},
		metadata: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	},
)

chatConversationSchema.index({ clientId: 1, status: 1, lastMessageAt: -1 })

module.exports = mongoose.models.ChatConversation || mongoose.model('ChatConversation', chatConversationSchema)
