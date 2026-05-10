import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { Bot, Headset, Loader2, MessageCircle, Send, UserRound, X } from 'lucide-react'
import {
	ChatApiError,
	getMyChatConversation,
	requestHumanSupport,
	sendChatMessage,
	type ChatConversation,
	type ChatConversationPayload,
	type ChatMessage,
	type ChatProductSuggestion,
	type ChatSendMessageResult,
} from '../../services/chat.service'

interface ClientChatWidgetProps {
	socket: Socket | null
	isOpen: boolean
	onClose: () => void
}

type AckPayload<T> = {
	success?: boolean
	data?: T
	error?: string
}

const isUnauthorizedError = (error: unknown) => {
	if (error instanceof ChatApiError) {
		return error.status === 401
	}

	if (error instanceof Error) {
		const message = error.message.toLowerCase()
		return message.includes('unauthorized') || message.includes('token')
	}

	return false
}

const upsertMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
	const byId = new Map<string, ChatMessage>()

	for (const item of current) {
		byId.set(item.id, item)
	}

	for (const item of incoming) {
		byId.set(item.id, item)
	}

	return Array.from(byId.values()).sort((a, b) => {
		const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
		const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
		return timeA - timeB
	})
}

const formatTime = (value: string) => {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return '--:--'
	}

	return date.toLocaleTimeString('vi-VN', {
		hour: '2-digit',
		minute: '2-digit',
	})
}

const toCurrencyVnd = (value?: number) => {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return ''
	}

	return `${Math.round(value).toLocaleString('vi-VN')} VND`
}

const normalizeImageUrl = (value: unknown): string => {
	if (!value) {
		return ''
	}

	if (Array.isArray(value)) {
		const first = value.find((item) => typeof item === 'string' && item.trim())
		return typeof first === 'string' ? first.trim() : ''
	}

	if (typeof value === 'string') {
		const trimmed = value.trim()
		if (!trimmed) {
			return ''
		}

		if (trimmed.startsWith('[')) {
			try {
				const parsed = JSON.parse(trimmed)
				return normalizeImageUrl(parsed)
			} catch {
				// Ignore and continue fallback parsing.
			}
		}

		if (trimmed.includes(',')) {
			const first = trimmed
				.split(',')
				.map((item) => item.trim())
				.find(Boolean)
			return first || ''
		}

		return trimmed
	}

	return ''
}

const parseProductSuggestions = (message: ChatMessage): ChatProductSuggestion[] => {
	const meta = message.meta as { productSuggestions?: unknown }
	if (!Array.isArray(meta?.productSuggestions)) {
		return []
	}

	const parsedItems: Array<ChatProductSuggestion | null> = meta.productSuggestions
		.map((item) => {
			if (!item || typeof item !== 'object') {
				return null
			}

			const candidate = item as Record<string, unknown>
			const id = typeof candidate.id === 'string' ? candidate.id : ''
			const productName = typeof candidate.productName === 'string' ? candidate.productName : ''
			if (!id || !productName) {
				return null
			}

			return {
				id,
				productName,
				imageUrl: normalizeImageUrl(candidate.imageUrl) || undefined,
				price: typeof candidate.price === 'number' ? candidate.price : undefined,
				productUrl: typeof candidate.productUrl === 'string' ? candidate.productUrl : undefined,
			} satisfies ChatProductSuggestion
		})

	return parsedItems.filter((item): item is ChatProductSuggestion => item !== null)
}

const openProductDetailFromChat = (productId: string, productUrl?: string) => {
	if (!productId && !productUrl) {
		return
	}

	let nextPath = `/product/${encodeURIComponent(productId)}`
	if (productUrl && productUrl.trim()) {
		try {
			const parsed = new URL(productUrl, window.location.origin)
			nextPath = `${parsed.pathname}${parsed.search}${parsed.hash}`
		} catch {
			nextPath = productUrl
		}
	}

	window.history.pushState({}, '', nextPath)
	window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function ClientChatWidget({ socket, isOpen, onClose }: ClientChatWidgetProps) {
	const [conversation, setConversation] = useState<ChatConversation | null>(null)
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [draft, setDraft] = useState('')
	const [loading, setLoading] = useState(false)
	const [sending, setSending] = useState(false)
	const [requestingHuman, setRequestingHuman] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isBotTyping, setIsBotTyping] = useState(false)
	const [humanNotice, setHumanNotice] = useState('')
	const bottomRef = useRef<HTMLDivElement | null>(null)

	const resetAuthState = useCallback(() => {
		localStorage.removeItem('clientAccessToken')
		setConversation(null)
		setMessages([])
		setError(null)
		setIsBotTyping(false)
		setHumanNotice('')
	}, [])

	const handleAuthError = useCallback(
		(loadError: unknown) => {
			if (!isUnauthorizedError(loadError)) {
				return false
			}

			resetAuthState()
			return true
		},
		[resetAuthState],
	)

	const emitWithAck = useCallback(
		<T,>(eventName: string, payload: Record<string, unknown>) => {
			return new Promise<T>((resolve, reject) => {
				if (!socket) {
					reject(new Error('Mat ket noi realtime'))
					return
				}

				socket.emit(eventName, payload, (response: AckPayload<T>) => {
					if (response?.success && response.data) {
						resolve(response.data)
						return
					}

					reject(new Error(response?.error || 'Realtime request failed'))
				})
			})
		},
		[socket],
	)

	const loadConversation = useCallback(async () => {
		const token = localStorage.getItem('clientAccessToken')
		if (!token) {
			setConversation(null)
			setMessages([])
			return
		}

		setLoading(true)
		setError(null)
		setHumanNotice('')

		try {
			let data: ChatConversationPayload

			if (socket?.connected) {
				try {
					data = await emitWithAck<ChatConversationPayload>('chat:conversation:get-or-create', { limit: 50 })
				} catch {
					data = await getMyChatConversation(50)
				}
			} else {
				data = await getMyChatConversation(50)
			}

			setConversation(data.conversation)
			setMessages(upsertMessages([], data.messages || []))
		} catch (loadError) {
			if (handleAuthError(loadError)) {
				return
			}

			const message = loadError instanceof Error ? loadError.message : 'Khong the tai cuoc tro chuyen'
			setError(message)
		} finally {
			setLoading(false)
		}
	}, [emitWithAck, handleAuthError, socket])

	useEffect(() => {
		if (!isOpen) {
			setDraft('')
			setError(null)
			setIsBotTyping(false)
			setHumanNotice('')
			return
		}

		void loadConversation()
	}, [isOpen, loadConversation])

	useEffect(() => {
		if (!socket) {
			return
		}

		const handleMessageNew = (payload: { conversationId?: string; message?: ChatMessage }) => {
			if (!payload?.conversationId || !payload.message) {
				return
			}

			if (!conversation || payload.conversationId !== conversation.id) {
				return
			}

			setMessages((prev) => upsertMessages(prev, [payload.message as ChatMessage]))

			if (payload.message.senderType !== 'user') {
				setIsBotTyping(false)
			}
		}

		const handleConversationUpdated = (payload: { conversation?: ChatConversation }) => {
			if (!payload?.conversation || !conversation) {
				return
			}

			if (payload.conversation.id !== conversation.id) {
				return
			}

			setConversation(payload.conversation)

			if (payload.conversation.status !== 'ai') {
				setIsBotTyping(false)
			}
		}

		const handleHumanJoined = (payload: {
			conversationId?: string
			staffName?: string
			message?: string
		}) => {
			if (!payload?.conversationId || !conversation) {
				return
			}

			if (payload.conversationId !== conversation.id) {
				return
			}

				setHumanNotice(payload.message || `Nhân viên ${payload.staffName || ''} đã tham gia hỗ trợ`.trim())
			setIsBotTyping(false)
		}

		socket.on('chat:message:new', handleMessageNew)
		socket.on('chat:conversation:updated', handleConversationUpdated)
		socket.on('chat:human-joined', handleHumanJoined)

		return () => {
			socket.off('chat:message:new', handleMessageNew)
			socket.off('chat:conversation:updated', handleConversationUpdated)
			socket.off('chat:human-joined', handleHumanJoined)
		}
	}, [conversation, socket])

	useEffect(() => {
		if (!isOpen) {
			return
		}

		bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [isOpen, messages, isBotTyping])

	const handleSendMessage = async () => {
		if (!conversation || sending) {
			return
		}

		const content = draft.trim()
		if (!content) {
			return
		}

		setDraft('')
		setSending(true)
		setError(null)
		if (conversation.status === 'ai') {
			setIsBotTyping(true)
		}

		try {
			let data: ChatSendMessageResult

			if (socket?.connected) {
				try {
					data = await emitWithAck<ChatSendMessageResult>('chat:message:send', {
						conversationId: conversation.id,
						content,
					})
				} catch {
					data = await sendChatMessage(conversation.id, content)
				}
			} else {
				data = await sendChatMessage(conversation.id, content)
			}

			setConversation(data.conversation)

			const ackMessages = [data.userMessage, data.systemMessage, data.botMessage].filter(
				(item): item is ChatMessage => Boolean(item),
			)
			if (ackMessages.length > 0) {
				setMessages((prev) => upsertMessages(prev, ackMessages))
			}

			if (data.conversation.status !== 'ai' || data.botMessage || data.systemMessage) {
				setIsBotTyping(false)
			}
		} catch (sendError) {
			if (handleAuthError(sendError)) {
				return
			}

			const message = sendError instanceof Error ? sendError.message : 'Khong the gui tin nhan'
			setError(message)
			setDraft(content)
			setIsBotTyping(false)
		} finally {
			setSending(false)
		}
	}

	const handleRequestHuman = async () => {
		if (!conversation || requestingHuman) {
			return
		}

		setRequestingHuman(true)
		setError(null)

		try {
			let data: { conversation: ChatConversation; systemMessage: ChatMessage | null }

			if (socket?.connected) {
				data = await emitWithAck<{ conversation: ChatConversation; systemMessage: ChatMessage | null }>(
					'chat:request-human',
					{
						conversationId: conversation.id,
						reason: 'customer_requested',
					},
				)
			} else {
				data = await requestHumanSupport(conversation.id, 'customer_requested')
			}

			setConversation(data.conversation)
			const systemMessage = data.systemMessage
			if (systemMessage !== null) {
				setMessages((prev) => upsertMessages(prev, [systemMessage]))
			}
				setHumanNotice('Nhân viên sẽ tham gia hỗ trợ trong giây lát.')
			setIsBotTyping(false)
		} catch (requestError) {
			if (handleAuthError(requestError)) {
				return
			}

			const message = requestError instanceof Error ? requestError.message : 'Không thể yêu cầu nhân viên'
			setError(message)
		} finally {
			setRequestingHuman(false)
		}
	}

	const statusMeta = useMemo(() => {
		switch (conversation?.status) {
			case 'human_pending':
				return {
					label: 'Đang đợi nhân viên',
					className: 'bg-amber-100 text-amber-700',
				}
			case 'human':
				return {
					label: 'Nhân viên đang hỗ trợ',
					className: 'bg-green-100 text-green-700',
				}
			case 'closed':
				return {
					label: 'Da dong hoi thoai',
					className: 'bg-slate-200 text-slate-700',
				}
			default:
				return {
					label: 'AI dang ho tro',
					className: 'bg-blue-100 text-blue-700',
				}
		}
	}, [conversation?.status])

	if (!isOpen) {
		return null
	}

	const hasToken = Boolean(localStorage.getItem('clientAccessToken'))

	return (
		<div className="fixed bottom-24 right-4 z-50 w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white shadow-2xl">
			<div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-white">
				<div className="flex items-center gap-2">
					<MessageCircle className="h-5 w-5" />
					<div>
						<p className="text-sm font-semibold">Tu van nhanh</p>
									<p className="text-xs text-white/80">AI + nhân viên nhà thuốc</p>
					</div>
				</div>
				<button
					onClick={onClose}
					className="rounded-full p-1 text-white/90 transition hover:bg-white/15"
					aria-label="Dong chat widget"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{!hasToken ? (
				<div className="space-y-3 p-4 text-sm text-gray-600">
					<p>Bạn cần đăng nhập để sử dụng khung chat hỗ trợ.</p>
					<button
						onClick={onClose}
						className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
					>
						Đóng
					</button>
				</div>
			) : (
				<>
					<div className="border-b border-gray-100 px-4 py-2">
						<div className="flex items-center justify-between gap-2">
							<span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
								{statusMeta.label}
							</span>
							{conversation?.status === 'ai' && (
								<button
									type="button"
									onClick={handleRequestHuman}
									disabled={requestingHuman || loading}
									className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
								>
									<Headset className="h-3.5 w-3.5" />
									Gặp nhân viên
								</button>
							)}
						</div>
						{humanNotice && <p className="mt-2 text-xs font-medium text-green-700">{humanNotice}</p>}
					</div>

					<div className="h-[360px] overflow-y-auto bg-gray-50 px-3 py-3">
						{loading ? (
							<div className="flex h-full items-center justify-center text-sm text-gray-500">
								<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải cuộc trò chuyện...
							</div>
						) : messages.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-gray-500">
								<Bot className="h-6 w-6 text-blue-500" />
							<p>Hãy gửi câu hỏi đầu tiên để AI hỗ trợ bạn.</p>
							</div>
						) : (
							<div className="space-y-2">
								{messages.map((message) => {
									const isUser = message.senderType === 'user'
									const isSystem = message.senderType === 'system'
									const isAdmin = message.senderType === 'admin'

									if (isSystem) {
										return (
											<div key={message.id} className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
												{message.content}
											</div>
										)
									}

									return (
										<div
											key={message.id}
											className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
										>
											{(() => {
												const productSuggestions = parseProductSuggestions(message)
												return (
													<div
														className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${isUser
															? 'bg-blue-600 text-white'
															: isAdmin
																? 'bg-green-600 text-white'
																: 'bg-white text-gray-800'
															}`}
													>
														<p className="text-sm leading-5">{message.content}</p>
														{productSuggestions.length > 0 && (
															<div className="mt-3 grid gap-2.5">
																{productSuggestions.map((product) => (
																	<button
																		type="button"
																		key={`${message.id}_${product.id}`}
																		onClick={() => openProductDetailFromChat(product.id, product.productUrl)}
																		className="group flex items-center gap-3 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 p-2.5 text-left transition hover:border-sky-400 hover:from-sky-100 hover:to-cyan-100"
																	>
																		{product.imageUrl ? (
																			<img src={product.imageUrl} alt={product.productName} className="h-16 w-16 rounded-lg border border-sky-100 object-cover" />
																		) : (
																			<div className="h-16 w-16 rounded-lg border border-sky-100 bg-gradient-to-br from-slate-100 to-slate-200" />
																		)}
																		<div className="min-w-0 flex-1">
																			<p className="line-clamp-2 text-sm font-semibold text-slate-900">{product.productName}</p>
																			{product.price !== undefined && (
																				<p className="mt-1 text-xs font-bold text-rose-600">{toCurrencyVnd(product.price)}</p>
																			)}
																			<p className="mt-1 text-[11px] font-medium text-sky-700 group-hover:text-sky-800">Xem chi tiết sản phẩm</p>
																		</div>
																	</button>
																))}
															</div>
														)}
														<div className={`mt-1 flex items-center gap-1 text-[10px] ${isUser || isAdmin ? 'text-white/80' : 'text-gray-500'}`}>
															{isUser ? <UserRound className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
															<span>{isUser ? 'Người dùng' : isAdmin ? 'Nhân viên' : 'Trợ lý'}</span>
															<span>•</span>
															<span>{formatTime(message.createdAt)}</span>
														</div>
													</div>
												)
											})()}
										</div>
									)
								})}

								{isBotTyping && (
									<div className="flex justify-start">
										<div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs text-gray-600 shadow-sm">
											<Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
										Bot đang xử lý...
										</div>
									</div>
								)}
							</div>
						)}
						<div ref={bottomRef} />
					</div>

					<div className="space-y-2 border-t border-gray-100 bg-white p-3">
						{error && <p className="text-xs text-red-600">{error}</p>}
						<div className="flex items-center gap-2">
							<input
								type="text"
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault()
										void handleSendMessage()
									}
								}}
								placeholder="Nhap noi dung can ho tro..."
								disabled={loading || sending || !conversation}
								className="h-10 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none transition focus:border-blue-400"
							/>
							<button
								type="button"
								onClick={() => {
									void handleSendMessage()
								}}
								disabled={loading || sending || !draft.trim() || !conversation}
								className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
							>
								{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	)
}
