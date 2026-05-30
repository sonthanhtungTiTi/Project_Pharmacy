import { apiGet, apiPatch } from '../utils/api.utils'

export type ChatConversationStatus = 'ai' | 'human_pending' | 'human' | 'closed'

export interface ChatUserSummary {
	id: string
	fullName: string
	email: string
	phone?: string
	role?: string
}

export interface ChatMessage {
	id: string
	conversationId: string
	senderType: 'user' | 'bot' | 'admin' | 'system'
	senderId: string | null
	senderName: string
	content: string
	intent: string
	action: string
		meta: Record<string, unknown> & {
			imageUrl?: string
			imagePublicId?: string
			imageName?: string
			imageSize?: number
		}
	createdAt: string
	updatedAt: string
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

export interface ChatConversationListItem extends ChatConversation {
	latestMessage: {
		content: string
		senderType: 'user' | 'bot' | 'admin' | 'system'
		createdAt: string
	} | null
}

export interface Pagination {
	page: number
	limit: number
	total: number
	totalPages: number
}

export interface ConversationListResponse {
	items: ChatConversationListItem[]
	pagination: Pagination
}

export interface ConversationQueryParams {
	page?: number
	limit?: number
	status?: 'all' | ChatConversationStatus
	keyword?: string
}

const adminChatService = {
	getConversations: async (params: ConversationQueryParams = {}): Promise<ConversationListResponse> => {
		const query = new URLSearchParams()

		if (params.page) query.set('page', String(params.page))
		if (params.limit) query.set('limit', String(params.limit))
		if (params.status) query.set('status', params.status)
		if (params.keyword) query.set('keyword', params.keyword)

		const querySuffix = query.toString() ? `?${query.toString()}` : ''
		const response = await apiGet(`/admin/chat/conversations${querySuffix}`)
		return response.data
	},

	getConversationMessages: async (
		conversationId: string,
		limit = 80,
	): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> => {
		const response = await apiGet(`/admin/chat/conversations/${conversationId}/messages?limit=${limit}`)
		return response.data
	},

	joinConversation: async (
		conversationId: string,
	): Promise<{ conversation: ChatConversation; systemMessage: ChatMessage | null }> => {
		const response = await apiPatch(`/admin/chat/conversations/${conversationId}/join`, {})
		return response.data
	},

	closeConversation: async (
		conversationId: string,
	): Promise<{ conversation: ChatConversation; systemMessage: ChatMessage | null }> => {
		const response = await apiPatch(`/admin/chat/conversations/${conversationId}/close`, {})
		return response.data
	},
}

export default adminChatService
