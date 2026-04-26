const chatService = require('../../services/chat/chat.service')
const callHandler = require('../../sockets/callHandler')

const { SUPPORT_ROLES } = chatService

const emitToSupportStaff = (io, eventName, payload) => {
	const onlineUsers = callHandler.onlineUsers
	if (!io || !onlineUsers || typeof onlineUsers.values !== 'function') {
		return
	}

	for (const user of onlineUsers.values()) {
		if (SUPPORT_ROLES.has(String(user.role || ''))) {
			io.to(String(user.userId)).emit(eventName, payload)
		}
	}
}

const emitConversationEvents = (io, data) => {
	if (!io || !data?.conversation?.id) {
		return
	}

	const conversationId = data.conversation.id
	const roomName = `chat:conversation:${conversationId}`

	if (data.userMessage) {
		io.to(roomName).emit('chat:message:new', {
			conversationId,
			message: data.userMessage,
		})
	}

	if (data.systemMessage) {
		io.to(roomName).emit('chat:message:new', {
			conversationId,
			message: data.systemMessage,
		})
	}

	if (data.botMessage) {
		io.to(roomName).emit('chat:message:new', {
			conversationId,
			message: data.botMessage,
		})
	}

	io.to(roomName).emit('chat:conversation:updated', {
		conversation: data.conversation,
	})

	emitToSupportStaff(io, 'chat:conversation:updated', {
		conversation: data.conversation,
	})

	if (data.requiresHuman) {
		emitToSupportStaff(io, 'chat:human-requested', {
			conversation: data.conversation,
		})

		emitToSupportStaff(io, 'new_support_request', {
			conversation: data.conversation,
			source: 'ai_call_admin',
		})
	}
}

const getMyConversation = async (req, res) => {
	try {
		const userId = req.user?.userId
		const limit = req.query?.limit
		const data = await chatService.getClientConversationSnapshot(userId, { limit })

		return res.status(200).json({
			success: true,
			message: 'Conversation loaded successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Load conversation failed',
			error: error.message,
		})
	}
}

const getMyMessages = async (req, res) => {
	try {
		const userId = req.user?.userId
		const conversationId = req.query?.conversationId
		const limit = req.query?.limit

		const data = conversationId
			? await chatService.getClientMessages(userId, conversationId, { limit })
			: await chatService.getClientConversationSnapshot(userId, { limit })

		return res.status(200).json({
			success: true,
			message: 'Messages loaded successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Load messages failed',
			error: error.message,
		})
	}
}

const requestHumanSupport = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { conversationId, reason } = req.body || {}
		const data = await chatService.requestHumanFromClient(userId, conversationId || null, reason || '')
		const io = req.app.get('io')

		if (io && data?.conversation) {
			emitToSupportStaff(io, 'chat:human-requested', {
				conversation: data.conversation,
			})

			emitToSupportStaff(io, 'new_support_request', {
				conversation: data.conversation,
				source: 'client_request',
			})
		}

		return res.status(200).json({
			success: true,
			message: 'Human support requested successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Request human support failed',
			error: error.message,
		})
	}
}

const sendMessage = async (req, res) => {
	try {
		const userId = req.user?.userId
		const userName = req.user?.fullName || req.user?.email || 'Khach hang'
		const { conversationId, message } = req.body || {}
		const content = String(message || '').trim()

		if (!content) {
			return res.status(400).json({
				success: false,
				message: 'message is required',
				error: 'message is required',
			})
		}

		const data = await chatService.handleClientMessage({
			clientId: userId,
			clientName: userName,
			conversationId: conversationId || null,
			content,
		})

		const io = req.app.get('io')
		emitConversationEvents(io, data)

		return res.status(200).json({
			success: true,
			message: 'Message processed successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Send message failed',
			error: error.message,
		})
	}
}

const handleChatWithAI = async (req, res) => {
	try {
		if (req.user?.userId) {
			return sendMessage(req, res)
		}

		const { message } = req.body || {}
		const content = String(message || '').trim()

		if (!content) {
			return res.status(400).json({
				success: false,
				message: 'message is required',
				error: 'message is required',
			})
		}

		const data = await chatService.handleGuestAiMessage({
			content,
			guestName: 'Khach vang lai',
		})

		return res.status(200).json({
			success: true,
			message: 'Guest AI chat processed successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'AI chat failed',
			error: error.message,
		})
	}
}

module.exports = {
	getMyConversation,
	getMyMessages,
	requestHumanSupport,
	sendMessage,
	handleChatWithAI,
}
