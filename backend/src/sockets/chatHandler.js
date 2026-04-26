const chatService = require('../services/chat/chat.service')

const { ChatServiceError, SUPPORT_ROLES } = chatService

const conversationRoom = (conversationId) => `chat:conversation:${conversationId}`

const asCallback = (cb) => (typeof cb === 'function' ? cb : () => {})

const emitToSupportStaff = (io, onlineUsers, eventName, payload) => {
	if (!onlineUsers || typeof onlineUsers.values !== 'function') {
		return
	}

	for (const user of onlineUsers.values()) {
		if (SUPPORT_ROLES.has(String(user.role || ''))) {
			io.to(String(user.userId)).emit(eventName, payload)
		}
	}
}

const mapError = (error) => {
	if (error instanceof ChatServiceError) {
		return {
			statusCode: error.statusCode,
			message: error.message,
		}
	}

	return {
		statusCode: 500,
		message: error?.message || 'Chat processing failed',
	}
}

const isSupportRole = (role) => SUPPORT_ROLES.has(String(role || ''))

const registerChatHandlers = ({ io, socket, onlineUsers }) => {
	const userRole = String(socket.userRole || '')
	const userId = String(socket.userId || '')
	const userName = String(socket.userName || 'User')

	socket.on('chat:conversation:get-or-create', async (payload, callback) => {
		const done = asCallback(callback)
		if (userRole !== 'customer') {
			done({ success: false, error: 'Only customers can create personal conversations' })
			return
		}

		try {
			const data = await chatService.getClientConversationSnapshot(userId, {
				limit: payload?.limit,
			})

			socket.join(conversationRoom(data.conversation.id))
			done({ success: true, data })
		} catch (error) {
			const mapped = mapError(error)
			done({ success: false, error: mapped.message })
		}
	})

	socket.on('chat:history:get', async (payload, callback) => {
		const done = asCallback(callback)
		const conversationId = payload?.conversationId
		if (!conversationId) {
			done({ success: false, error: 'conversationId is required' })
			return
		}

		try {
			const data = isSupportRole(userRole)
				? await chatService.getConversationMessagesForAdmin(userId, conversationId, {
						limit: payload?.limit,
				  })
				: await chatService.getClientMessages(userId, conversationId, {
						limit: payload?.limit,
				  })

			socket.join(conversationRoom(conversationId))
			done({ success: true, data })
		} catch (error) {
			const mapped = mapError(error)
			done({ success: false, error: mapped.message })
		}
	})

	socket.on('chat:request-human', async (payload, callback) => {
		const done = asCallback(callback)
		if (userRole !== 'customer') {
			done({ success: false, error: 'Only customers can request human support' })
			return
		}

		try {
			const data = await chatService.requestHumanFromClient(
				userId,
				payload?.conversationId || null,
				payload?.reason || '',
			)

			socket.join(conversationRoom(data.conversation.id))

			if (data.systemMessage) {
				io.to(conversationRoom(data.conversation.id)).emit('chat:message:new', {
					conversationId: data.conversation.id,
					message: data.systemMessage,
				})
			}

			io.to(conversationRoom(data.conversation.id)).emit('chat:conversation:updated', {
				conversation: data.conversation,
			})

			emitToSupportStaff(io, onlineUsers, 'chat:human-requested', {
				conversation: data.conversation,
			})

			emitToSupportStaff(io, onlineUsers, 'new_support_request', {
				conversation: data.conversation,
				source: 'client_request',
			})

			done({ success: true, data })
		} catch (error) {
			const mapped = mapError(error)
			done({ success: false, error: mapped.message })
		}
	})

	socket.on('chat:admin:join', async (payload, callback) => {
		const done = asCallback(callback)
		if (!isSupportRole(userRole)) {
			done({ success: false, error: 'Only support staff can join this conversation' })
			return
		}

		try {
			const conversationId = payload?.conversationId
			const data = await chatService.assignConversationToStaff(conversationId, {
				staffId: userId,
				staffName: userName,
			})

			socket.join(conversationRoom(data.conversation.id))

			if (data.systemMessage) {
				io.to(conversationRoom(data.conversation.id)).emit('chat:message:new', {
					conversationId: data.conversation.id,
					message: data.systemMessage,
				})
			}

			io.to(conversationRoom(data.conversation.id)).emit('chat:human-joined', {
				conversationId: data.conversation.id,
				staffName: userName,
				message: `Nhan vien ${userName} da tham gia ho tro`,
			})

			io.to(conversationRoom(data.conversation.id)).emit('chat:conversation:updated', {
				conversation: data.conversation,
			})

			emitToSupportStaff(io, onlineUsers, 'chat:conversation:updated', {
				conversation: data.conversation,
			})

			done({ success: true, data })
		} catch (error) {
			const mapped = mapError(error)
			done({ success: false, error: mapped.message })
		}
	})

	socket.on('chat:conversation:close', async (payload, callback) => {
		const done = asCallback(callback)
		if (!isSupportRole(userRole)) {
			done({ success: false, error: 'Only support staff can close conversations' })
			return
		}

		try {
			const data = await chatService.closeConversationByStaff(payload?.conversationId, userId)

			socket.join(conversationRoom(data.conversation.id))

			if (data.systemMessage) {
				io.to(conversationRoom(data.conversation.id)).emit('chat:message:new', {
					conversationId: data.conversation.id,
					message: data.systemMessage,
				})
			}

			io.to(conversationRoom(data.conversation.id)).emit('chat:conversation:updated', {
				conversation: data.conversation,
			})

			emitToSupportStaff(io, onlineUsers, 'chat:conversation:updated', {
				conversation: data.conversation,
			})

			done({ success: true, data })
		} catch (error) {
			const mapped = mapError(error)
			done({ success: false, error: mapped.message })
		}
	})

	socket.on('chat:message:send', async (payload, callback) => {
		const done = asCallback(callback)
		const conversationId = String(payload?.conversationId || '').trim()
		const content = String(payload?.content || '').trim()

		if (!conversationId) {
			done({ success: false, error: 'conversationId is required' })
			return
		}

		if (!content) {
			done({ success: false, error: 'content is required' })
			return
		}

		try {
			if (isSupportRole(userRole)) {
				const data = await chatService.handleStaffMessage({
					staffId: userId,
					staffName: userName,
					conversationId,
					content,
				})

				io.to(conversationRoom(data.conversation.id)).emit('chat:message:new', {
					conversationId: data.conversation.id,
					message: data.message,
				})

				io.to(conversationRoom(data.conversation.id)).emit('chat:conversation:updated', {
					conversation: data.conversation,
				})

				emitToSupportStaff(io, onlineUsers, 'chat:conversation:updated', {
					conversation: data.conversation,
				})

				done({ success: true, data })
				return
			}

			const data = await chatService.handleClientMessage({
				clientId: userId,
				clientName: userName,
				conversationId,
				content,
			})

			socket.join(conversationRoom(data.conversation.id))

			if (data.userMessage) {
				io.to(conversationRoom(data.conversation.id)).emit('chat:message:new', {
					conversationId: data.conversation.id,
					message: data.userMessage,
				})
			}

			if (data.systemMessage) {
				io.to(conversationRoom(data.conversation.id)).emit('chat:message:new', {
					conversationId: data.conversation.id,
					message: data.systemMessage,
				})
			}

			if (data.botMessage) {
				io.to(conversationRoom(data.conversation.id)).emit('chat:message:new', {
					conversationId: data.conversation.id,
					message: data.botMessage,
				})
			}

			io.to(conversationRoom(data.conversation.id)).emit('chat:conversation:updated', {
				conversation: data.conversation,
			})

			emitToSupportStaff(io, onlineUsers, 'chat:conversation:updated', {
				conversation: data.conversation,
			})

			if (data.requiresHuman) {
				emitToSupportStaff(io, onlineUsers, 'chat:human-requested', {
					conversation: data.conversation,
				})

				emitToSupportStaff(io, onlineUsers, 'new_support_request', {
					conversation: data.conversation,
					source: 'ai_call_admin',
				})
			}

			done({ success: true, data })
		} catch (error) {
			const mapped = mapError(error)
			done({ success: false, error: mapped.message })
		}
	})
}

module.exports = registerChatHandlers
