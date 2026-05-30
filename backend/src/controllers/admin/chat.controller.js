const chatService = require('../../services/chat/chat.service')

const getConversations = async (req, res) => {
	try {
		const data = await chatService.listConversationsForAdmin(req.query || {})
		return res.status(200).json({
			success: true,
			message: 'Conversations loaded successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Load conversations failed',
			error: error.message,
		})
	}
}

const getConversationMessages = async (req, res) => {
	try {
		const staffId = req.user?.userId
		const { conversationId } = req.params
		const limit = req.query?.limit

		const data = await chatService.getConversationMessagesForAdmin(staffId, conversationId, { limit })
		return res.status(200).json({
			success: true,
			message: 'Conversation messages loaded successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Load conversation messages failed',
			error: error.message,
		})
	}
}

const joinConversation = async (req, res) => {
	try {
		const staffId = req.user?.userId
		const staffName = req.user?.fullName || ''
		const { conversationId } = req.params

		const data = await chatService.assignConversationToStaff(conversationId, { staffId, staffName })

		const io = req.app.get('io')
		if (io) {
			const roomName = `chat:conversation:${data.conversation.id}`
			const clientId = String(data.conversation?.client?.id || data.conversation?.clientId || '')
			if (data.systemMessage) {
				io.to(roomName).to(clientId).emit('chat:message:new', {
					conversationId: data.conversation.id,
					message: data.systemMessage,
				})
			}
			io.to(roomName).to(clientId).emit('chat:human-joined', {
				conversationId: data.conversation.id,
				staffName: staffName,
				message: `Nhan vien ${staffName} da tham gia ho tro`,
			})
			io.to(roomName).to(clientId).emit('chat:conversation:updated', {
				conversation: data.conversation,
			})
		}

		return res.status(200).json({
			success: true,
			message: 'Conversation assigned successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Join conversation failed',
			error: error.message,
		})
	}
}

const closeConversation = async (req, res) => {
	try {
		const staffId = req.user?.userId
		const { conversationId } = req.params

		const data = await chatService.closeConversationByStaff(conversationId, staffId)

		const io = req.app.get('io')
		if (io) {
			const roomName = `chat:conversation:${data.conversation.id}`
			const clientId = String(data.conversation?.client?.id || data.conversation?.clientId || '')
			if (data.systemMessage) {
				io.to(roomName).to(clientId).emit('chat:message:new', {
					conversationId: data.conversation.id,
					message: data.systemMessage,
				})
			}
			io.to(roomName).to(clientId).emit('chat:conversation:updated', {
				conversation: data.conversation,
			})
		}

		return res.status(200).json({
			success: true,
			message: 'Conversation closed successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Close conversation failed',
			error: error.message,
		})
	}
}

module.exports = {
	getConversations,
	getConversationMessages,
	joinConversation,
	closeConversation,
}
