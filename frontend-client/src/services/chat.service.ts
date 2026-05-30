export type ChatConversationStatus = 'ai' | 'human_pending' | 'human' | 'closed'

export interface ChatUserSummary {
	id: string
	fullName: string
	email: string
	phone?: string
	role?: string
}

export interface ChatConversation {
	id: string
	sessionId: string
	status: ChatConversationStatus
	clientId: string
	client: ChatUserSummary | null
	assignedStaffId: string | null
	assignedStaff: ChatUserSummary | null
	lastIntent: string
	lastAction: string
	lastMessageAt: string
	unreadForClient: number
	unreadForAdmin: number
	metadata: Record<string, unknown>
	createdAt: string
	updatedAt: string
}

export type ChatMessageSenderType = 'user' | 'bot' | 'admin' | 'system'

export interface ChatProductSuggestion {
	id: string
	productName: string
	imageUrl?: string
	price?: number
	productUrl?: string
}

export interface ChatMessage {
	id: string
	conversationId: string
	senderType: ChatMessageSenderType
	senderId: string | null
	senderName: string
	content: string
	intent: string
	action: string
	meta: Record<string, unknown> & {
		productSuggestions?: ChatProductSuggestion[]
	}
	createdAt: string
	updatedAt: string
}

export interface ChatConversationPayload {
	conversation: ChatConversation
	messages: ChatMessage[]
}

export interface ChatSendMessageResult {
	conversation: ChatConversation
	userMessage: ChatMessage | null
	botMessage: ChatMessage | null
	systemMessage: ChatMessage | null
	requiresHuman: boolean
	action: string
}

interface ApiResponse<T> {
	success: boolean
	message: string
	data?: T
	error?: string
}

export class ChatApiError extends Error {
	status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = 'ChatApiError'
		this.status = status
	}
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

const getAuthHeaders = () => {
	const token = localStorage.getItem('clientAccessToken')
	if (!token) {
		throw new Error('Vui lòng đăng nhập để sử dụng tư vấn')
	}

	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`,
	}
}

const parseApiResponse = async <T>(response: Response): Promise<T> => {
	let payload: ApiResponse<T> | null = null

	try {
		payload = (await response.json()) as ApiResponse<T>
	} catch {
		payload = null
	}

	if (!response.ok || !payload?.success || !payload?.data) {
		const message = payload?.message || payload?.error || `Chat request failed (${response.status})`
		throw new ChatApiError(message, response.status)
	}

	return payload.data
}

export const getMyChatConversation = async (limit = 40) => {
	const response = await fetch(`${API_BASE_URL}/client/chat/conversation?limit=${limit}`, {
		method: 'GET',
		headers: getAuthHeaders(),
	})

	return parseApiResponse<ChatConversationPayload>(response)
}

export const requestHumanSupport = async (conversationId: string, reason = '') => {
	const response = await fetch(`${API_BASE_URL}/client/chat/request-human`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify({ conversationId, reason }),
	})

	return parseApiResponse<{
		conversation: ChatConversation
		systemMessage: ChatMessage | null
	}>(response)
}

export const sendChatMessage = async (conversationId: string, message: string) => {
	const response = await fetch(`${API_BASE_URL}/client/chat/message`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify({ conversationId, message }),
	})

	return parseApiResponse<ChatSendMessageResult>(response)
}
