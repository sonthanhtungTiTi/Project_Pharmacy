import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import io, { type Socket } from 'socket.io-client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPhone, faUsers, faVideo } from '@fortawesome/free-solid-svg-icons'
import adminUserService from '../services/admin-user.service'
import type { AdminUserItem } from '../services/admin-user.service'
import { useAuthStore } from '../stores/authStore'
import adminChatService, {
	type ChatConversation,
	type ChatConversationListItem,
	type ChatConversationStatus,
	type ChatMessage,
} from '../services/admin-chat.service'

const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '')

const statusLabelMap: Record<'all' | ChatConversationStatus, string> = {
	all: 'Tất cả',
	ai: 'AI',
	human_pending: 'Chờ nhân viên',
	human: 'Đang có nhân viên',
	closed: 'Đã đóng',
}

const statusClassMap: Record<ChatConversationStatus, string> = {
	ai: 'bg-blue-100 text-blue-700',
	human_pending: 'bg-amber-100 text-amber-700',
	human: 'bg-green-100 text-green-700',
	closed: 'bg-slate-100 text-slate-700',
}

const sortConversations = (items: ChatConversationListItem[]) => {
	return [...items].sort((a, b) => {
		const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
		const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
		return timeB - timeA
	})
}

const upsertConversationItem = (
	items: ChatConversationListItem[],
	nextItem: ChatConversationListItem,
) => {
	const index = items.findIndex((item) => item.id === nextItem.id)
	if (index < 0) {
		return sortConversations([nextItem, ...items])
	}

	const cloned = [...items]
	cloned[index] = nextItem
	return sortConversations(cloned)
}

const upsertMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
	const map = new Map<string, ChatMessage>()

	for (const item of current) {
		map.set(item.id, item)
	}

	for (const item of incoming) {
		map.set(item.id, item)
	}

	return Array.from(map.values()).sort((a, b) => {
		const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
		const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
		return timeA - timeB
	})
}

const formatDateTime = (value: string) => {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return '--:--'
	}

	return date.toLocaleString('vi-VN', {
		hour: '2-digit',
		minute: '2-digit',
		day: '2-digit',
		month: '2-digit',
	})
}

const toCurrencyVnd = (value?: number) => {
	if (typeof value !== 'number' || !Number.isFinite(value)) return ''
	return `${Math.round(value).toLocaleString('vi-VN')} VND`
}

const normalizeImageUrl = (value: unknown): string => {
	if (!value) return ''
	if (Array.isArray(value)) {
		const first = value.find((item) => typeof item === 'string' && item.trim())
		return typeof first === 'string' ? first.trim() : ''
	}
	if (typeof value === 'string') {
		const trimmed = value.trim()
		if (!trimmed) return ''
		if (trimmed.startsWith('data:')) return trimmed
		if (trimmed.startsWith('[')) {
			try {
				const parsed = JSON.parse(trimmed)
				return normalizeImageUrl(parsed)
			} catch {}
		}
		if (trimmed.includes(',')) {
			const first = trimmed.split(',').map((item) => item.trim()).find(Boolean)
			return first || ''
		}
		return trimmed
	}
	return ''
}

const parseProductSuggestions = (message: ChatMessage) => {
	const meta = message.meta as { productSuggestions?: unknown }
	if (!Array.isArray(meta?.productSuggestions)) return []

	const parsedItems = meta.productSuggestions.map((item) => {
		if (!item || typeof item !== 'object') return null
		const candidate = item as Record<string, unknown>
		const id = typeof candidate.id === 'string' ? candidate.id : ''
		const productName = typeof candidate.productName === 'string' ? candidate.productName : ''
		if (!id || !productName) return null
		return {
			id,
			productName,
			imageUrl: normalizeImageUrl(candidate.imageUrl) || undefined,
			price: typeof candidate.price === 'number' ? candidate.price : undefined,
			productUrl: typeof candidate.productUrl === 'string' ? candidate.productUrl : undefined,
		}
	})
	return parsedItems.filter((item) => item !== null) as Array<{
		id: string
		productName: string
		imageUrl?: string
		price?: number
		productUrl?: string
	}>
}

const getMessageImageUrl = (message: ChatMessage) => {
  const meta = (message.meta || {}) as Record<string, unknown>
  const raw = meta.imageUrl || meta.image
  return typeof raw === 'string' ? raw.trim() : ''
}

const toConversationListItem = (
	conversation: ChatConversation,
	latestMessage: ChatConversationListItem['latestMessage'] | null,
): ChatConversationListItem => ({
	...conversation,
	latestMessage,
})

export default function Support() {
  const { token, isAuthenticated } = useAuthStore()
  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [currentUserName, setCurrentUserName] = useState('Nhân viên')
	const [customers, setCustomers] = useState<AdminUserItem[]>([])
	const [loadingCustomers, setLoadingCustomers] = useState(true)

	const [conversations, setConversations] = useState<ChatConversationListItem[]>([])
	const [selectedConversationId, setSelectedConversationId] = useState('')
	const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null)
	const [messages, setMessages] = useState<ChatMessage[]>([])

	const [loadingConversations, setLoadingConversations] = useState(true)
	const [loadingMessages, setLoadingMessages] = useState(false)
	const [sendingMessage, setSendingMessage] = useState(false)
	const [joiningConversation, setJoiningConversation] = useState(false)
	const [closingConversation, setClosingConversation] = useState(false)

	const [chatError, setChatError] = useState<string | null>(null)
	const [keyword, setKeyword] = useState('')
	const [appliedKeyword, setAppliedKeyword] = useState('')
	const [statusFilter, setStatusFilter] = useState<'all' | ChatConversationStatus>('all')
	const [messageDraft, setMessageDraft] = useState('')
	const [actioningPrescription, setActioningPrescription] = useState<string | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imagePreviewScale, setImagePreviewScale] = useState(1)

  const selectedConversation = useMemo(() => {
    return conversations.find((item) => item.id === selectedConversationId) || null
  }, [conversations, selectedConversationId])

  const openImagePreview = (url: string) => {
    if (!url) return
    setImagePreviewUrl(url)
    setImagePreviewScale(1)
  }

  const closeImagePreview = () => {
    setImagePreviewUrl(null)
    setImagePreviewScale(1)
  }

  const adjustPreviewScale = (delta: number) => {
    setImagePreviewScale((prev) => Math.min(4, Math.max(1, prev + delta)))
  }

  useEffect(() => {
    const userRaw = localStorage.getItem('adminUser')
    if (!userRaw) {
      return
    }

    try {
      const parsed = JSON.parse(userRaw) as { fullName?: string; name?: string; email?: string }
      setCurrentUserName(parsed.fullName || parsed.name || parsed.email || 'Nhân viên')
    } catch {
      setCurrentUserName('Nhân viên')
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setSocket(null)
      return
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ['polling', 'websocket'],
      upgrade: true,
      secure: SOCKET_URL.startsWith('https'),
    })

    const handleConnect = () => {
      const transportName = (newSocket as any).io?.engine?.transport?.name || 'unknown'
      console.log('[Socket] Connected!', newSocket.id, 'transport:', transportName)
      setChatError(null)
    }
    const handleDisconnect = (reason: string) => {
      console.warn('[Socket] Disconnected:', reason)
    }
    const handleConnectError = (err: Error) => {
      console.error('[Socket] Connect error:', {
        message: err?.message,
        cause: (err as any)?.cause,
      })
    }
    const handleUpgrade = (transport: string) => {
      console.log('[Socket] Upgraded to:', transport)
    }

    newSocket.on('connect', handleConnect)
    newSocket.on('disconnect', handleDisconnect)
    newSocket.on('connect_error', handleConnectError)
    newSocket.on('upgrade', handleUpgrade)

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.off('connect', handleConnect)
      newSocket.off('disconnect', handleDisconnect)
      newSocket.off('connect_error', handleConnectError)
      newSocket.off('upgrade', handleUpgrade)
      newSocket.disconnect()
      if (socketRef.current === newSocket) {
        socketRef.current = null
      }
      setSocket(null)
    }
  }, [isAuthenticated, token])

  const ensureSocketConnected = useCallback(async () => {
    if (!socket) {
      throw new Error('Mất kết nối realtime')
    }

    if (socket.connected) {
      return
    }

    if (socket.disconnected) {
      socket.connect()
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup()
        reject(new Error('Cần kết nối realtime để gửi tin nhắn'))
      }, 4000)

      const handleConnect = () => {
        cleanup()
        resolve()
      }

      const handleError = (err: Error) => {
        cleanup()
        reject(new Error(err?.message || 'Cần kết nối realtime để gửi tin nhắn'))
      }

      const cleanup = () => {
        window.clearTimeout(timeout)
        socket.off('connect', handleConnect)
        socket.off('connect_error', handleError)
      }

      socket.once('connect', handleConnect)
      socket.once('connect_error', handleError)
    })
  }, [socket])

  const emitWithAck = useCallback(
    <T,>(eventName: string, payload: Record<string, unknown>) => {
      return new Promise<T>((resolve, reject) => {
        if (!socket) {
          reject(new Error('Mất kết nối realtime'))
          return
        }

        socket.emit(eventName, payload, (response: { success?: boolean; data?: T; error?: string }) => {
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

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true)
    try {
      const data = await adminUserService.getUsers({
        page: 1,
        limit: 8,
        role: 'customer',
        status: 'active',
      })
      setCustomers(data.items)
    } catch {
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }, [])

  const loadConversations = useCallback(async (keepCurrentSelection = true) => {
    setLoadingConversations(true)
    setChatError(null)

    try {
      const data = await adminChatService.getConversations({
        page: 1,
        limit: 30,
        status: statusFilter,
        keyword: appliedKeyword || undefined,
      })

      const nextItems = sortConversations(data.items)
      setConversations(nextItems)

      setSelectedConversationId((previousId) => {
        if (keepCurrentSelection && previousId && nextItems.some((item) => item.id === previousId)) {
          return previousId
        }
        return nextItems[0]?.id || ''
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải danh sách hội thoại'
      setChatError(message)
    } finally {
      setLoadingConversations(false)
    }
  }, [appliedKeyword, statusFilter])

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true)
    setChatError(null)

    try {
      const data = await adminChatService.getConversationMessages(conversationId, 100)
      setActiveConversation(data.conversation)
      setMessages(upsertMessages([], data.messages || []))

      setConversations((prev) => {
        const existing = prev.find((item) => item.id === data.conversation.id)
        if (!existing) {
          return prev
        }

        const next = {
          ...existing,
          ...data.conversation,
          unreadForAdmin: 0,
          latestMessage: existing.latestMessage,
        }
        return upsertConversationItem(prev, next)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải tin nhắn'
      setChatError(message)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const mergeConversationUpdate = useCallback((conversation: ChatConversation) => {
    setConversations((prev) => {
      const existing = prev.find((item) => item.id === conversation.id)
      const next = toConversationListItem(conversation, existing?.latestMessage || null)
      return upsertConversationItem(prev, next)
    })

    setActiveConversation((prev) => {
      if (!prev || prev.id !== conversation.id) {
        return prev
      }
      return {
        ...prev,
        ...conversation,
      }
    })
  }, [])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    void loadConversations(false)
  }, [loadConversations])

  useEffect(() => {
    if (!selectedConversationId) {
      setActiveConversation(null)
      setMessages([])
      return
    }

    void loadConversationMessages(selectedConversationId)
  }, [loadConversationMessages, selectedConversationId])

  useEffect(() => {
    if (!socket) {
      return
    }

    const onConversationUpdated = (payload: { conversation?: ChatConversation }) => {
      if (!payload?.conversation) {
        return
      }
      mergeConversationUpdate(payload.conversation)
    }

    const onHumanRequested = (payload: { conversation?: ChatConversation }) => {
      if (!payload?.conversation) {
        return
      }
      mergeConversationUpdate(payload.conversation)
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg')
      audio.play().catch(() => {
        // Trinh duyet co the block autoplay neu user chua tuong tac
      })
    }

    const onMessageNew = (payload: { conversationId?: string; message?: ChatMessage }) => {
      if (!payload?.conversationId || !payload.message) {
        return
      }

      const incomingMessage = payload.message

      if (payload.conversationId === selectedConversationId) {
        setMessages((prev) => upsertMessages(prev, [incomingMessage]))
      }

      setConversations((prev) => {
        const existing = prev.find((item) => item.id === payload.conversationId)
        if (!existing) {
          return prev
        }

        if (
          existing.latestMessage &&
          existing.latestMessage.content === incomingMessage.content &&
          existing.latestMessage.senderType === incomingMessage.senderType &&
          existing.latestMessage.createdAt === incomingMessage.createdAt
        ) {
          return prev
        }

        const shouldResetUnread =
          payload.conversationId === selectedConversationId || incomingMessage.senderType !== 'user'

        const next = {
          ...existing,
          lastMessageAt: incomingMessage.createdAt || new Date().toISOString(),
          unreadForAdmin: shouldResetUnread
            ? 0
            : Number(existing.unreadForAdmin || 0) + 1,
          latestMessage: {
            content: incomingMessage.content,
            senderType: incomingMessage.senderType,
            createdAt: incomingMessage.createdAt,
          },
        }

        return upsertConversationItem(prev, next)
      })
    }

    socket.on('chat:conversation:updated', onConversationUpdated)
    socket.on('chat:human-requested', onHumanRequested)
    socket.on('chat:message:new', onMessageNew)

    return () => {
      socket.off('chat:conversation:updated', onConversationUpdated)
      socket.off('chat:human-requested', onHumanRequested)
      socket.off('chat:message:new', onMessageNew)
    }
  }, [mergeConversationUpdate, selectedConversationId, socket])

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const joinConversation = async () => {
    if (!selectedConversationId || joiningConversation) {
      return
    }

    setJoiningConversation(true)
    setChatError(null)

    try {
      let data: { conversation: ChatConversation; systemMessage: ChatMessage | null }

      if (socket?.connected) {
        data = await emitWithAck('chat:admin:join', {
          conversationId: selectedConversationId,
        })
      } else {
        data = await adminChatService.joinConversation(selectedConversationId)
      }

      mergeConversationUpdate(data.conversation)
      setActiveConversation(data.conversation)
      const systemMessage = data.systemMessage
      if (systemMessage !== null) {
        setMessages((prev) => upsertMessages(prev, [systemMessage]))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể nhận hội thoại'
      setChatError(message)
    } finally {
      setJoiningConversation(false)
    }
  }

  const closeConversation = async () => {
    if (!selectedConversationId || closingConversation) {
      return
    }

    setClosingConversation(true)
    setChatError(null)

    try {
      let data: { conversation: ChatConversation; systemMessage: ChatMessage | null }

      if (socket?.connected) {
        data = await emitWithAck('chat:conversation:close', {
          conversationId: selectedConversationId,
        })
      } else {
        data = await adminChatService.closeConversation(selectedConversationId)
      }

      mergeConversationUpdate(data.conversation)
      setActiveConversation(data.conversation)
      const systemMessage = data.systemMessage
      if (systemMessage !== null) {
        setMessages((prev) => upsertMessages(prev, [systemMessage]))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đóng hội thoại'
      setChatError(message)
    } finally {
      setClosingConversation(false)
    }
  }

  const sendMessage = async () => {
    // ... (unchanged code)
    if (!selectedConversationId || sendingMessage) {
      return
    }

    const content = messageDraft.trim()
    if (!content) {
      return
    }

    setSendingMessage(true)
    setChatError(null)
    setMessageDraft('')

    try {
      await ensureSocketConnected()

      const data = await emitWithAck<{ conversation: ChatConversation; message: ChatMessage }>(
        'chat:message:send',
        {
          conversationId: selectedConversationId,
          content,
        },
      )

      mergeConversationUpdate(data.conversation)
      setActiveConversation(data.conversation)
      setMessages((prev) => upsertMessages(prev, [data.message]))

      setConversations((prev) => {
        const existing = prev.find((item) => item.id === selectedConversationId)
        if (!existing) {
          return prev
        }

        const next = {
          ...existing,
          lastMessageAt: data.message.createdAt || new Date().toISOString(),
          unreadForAdmin: 0,
          latestMessage: {
            content: data.message.content,
            senderType: data.message.senderType,
            createdAt: data.message.createdAt,
          },
        }

        return upsertConversationItem(prev, next)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể gửi tin nhắn'
      setChatError(message)
      setMessageDraft(content)
    } finally {
      setSendingMessage(false)
    }
  }

  const handlePrescriptionAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (actioningPrescription) return
    setActioningPrescription(requestId)
    setChatError(null)

    try {
      const token = localStorage.getItem('adminAccessToken')
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/prescriptions/${requestId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (data.success) {
        alert(action === 'approve' ? 'Đã duyệt đơn thuốc và thêm vào giỏ hàng của khách!' : 'Đã từ chối đơn thuốc!')
        // Close conversation optionally, or let them continue chatting
      } else {
        setChatError(data.message || 'Lỗi khi xử lý đơn thuốc')
      }
    } catch (error) {
      setChatError('Lỗi kết nối khi xử lý đơn thuốc')
    } finally {
      setActioningPrescription(null)
    }
  }

  const canJoinConversation =
    !!activeConversation && activeConversation.status !== 'closed' && activeConversation.status !== 'human'
  const canCloseConversation = !!activeConversation && activeConversation.status !== 'closed'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FontAwesomeIcon icon={faPhone} className="text-blue-600" />
          Trung Tâm Hỗ Trợ Khách Hàng
        </h1>
        <p className="text-gray-600 mt-1">Theo dõi hội thoại AI và tham gia hỗ trợ realtime.</p>
      </div>

      {chatError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
          {chatError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Hội thoại chat</h2>
            <button
              type="button"
              onClick={() => {
                void loadConversations()
              }}
              className="px-2.5 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Làm mới
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  setAppliedKeyword(keyword.trim())
                }
              }}
              placeholder="Tìm theo tên, email, session..."
              className="h-9 flex-1 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => setAppliedKeyword(keyword.trim())}
              className="px-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Tim
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(statusLabelMap) as Array<'all' | ChatConversationStatus>).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {statusLabelMap[status]}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {loadingConversations ? (
              <div className="p-6 text-sm text-center text-gray-500">Đang tải hội thoại...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-sm text-center text-gray-500">Chưa có hội thoại nào</div>
            ) : (
              conversations.map((conversation) => {
                const isActive = selectedConversationId === conversation.id
                const unread = Number(conversation.unreadForAdmin || 0)

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      isActive
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {conversation.client?.fullName || 'Khách hàng'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {conversation.client?.email || conversation.sessionId}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${statusClassMap[conversation.status]}`}>
                        {statusLabelMap[conversation.status]}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                      {conversation.latestMessage?.content || 'Chưa có tin nhắn'}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        {formatDateTime(conversation.lastMessageAt)}
                      </span>
                      {unread > 0 && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {unread}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-0 overflow-hidden">
          {!selectedConversation ? (
            <div className="h-full min-h-[520px] flex items-center justify-center text-gray-500 text-sm px-6 text-center">
              Chọn một hội thoại ở cột bên trái để bắt đầu hỗ trợ.
            </div>
          ) : (
            <>
              <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {selectedConversation.client?.fullName || 'Khách hàng'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {selectedConversation.client?.email || selectedConversation.sessionId}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClassMap[selectedConversation.status]}`}>
                    {statusLabelMap[selectedConversation.status]}
                  </span>

                  {canJoinConversation && (
                    <button
                      type="button"
                      onClick={() => {
                        void joinConversation()
                      }}
                      disabled={joiningConversation}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {joiningConversation ? 'Đang nhận...' : 'Nhận hỗ trợ'}
                    </button>
                  )}

                  {canCloseConversation && (
                    <button
                      type="button"
                      onClick={() => {
                        void closeConversation()
                      }}
                      disabled={closingConversation}
                      className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {closingConversation ? 'Đang đóng...' : 'Đóng hội thoại'}
                    </button>
                  )}
                </div>
              </div>

              <div className="h-[420px] overflow-y-auto bg-gray-50 px-4 py-3 space-y-2">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Dang tải tin nhắn...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Hội thoại này chưa có tin nhắn.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isSystem = message.senderType === 'system'
                    const isAdmin = message.senderType === 'admin'
                    const isUser = message.senderType === 'user'
                    const imageUrl = getMessageImageUrl(message)

                    if (isSystem) {
                      const reqMatch = message.content.match(/Mã yêu cầu: ([a-zA-Z0-9]+)/)
                      const reqId = reqMatch ? reqMatch[1] : null
                      const linkMatch = message.content.match(/Link ảnh đơn thuốc: (https?:\/\/[^\s]+)/)
                      const linkImg = linkMatch ? linkMatch[1] : null

                      return (
                        <div key={message.id} className="rounded-md bg-amber-50 text-amber-700 text-xs text-center px-3 py-2 flex flex-col items-center gap-2">
                          <p>{message.content}</p>
                          {linkImg && (
                            <a href={linkImg} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                              Xem ảnh đơn thuốc gốc
                            </a>
                          )}
                          {reqId && (
                            <div className="flex gap-3 mt-2">
                              <button
                                type="button"
                                onClick={() => handlePrescriptionAction(reqId, 'approve')}
                                disabled={actioningPrescription === reqId}
                                className="px-3 py-1 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50"
                              >
                                {actioningPrescription === reqId ? 'Đang duyệt...' : 'Duyệt (Thêm vào giỏ)'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrescriptionAction(reqId, 'reject')}
                                disabled={actioningPrescription === reqId}
                                className="px-3 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                              >
                                {actioningPrescription === reqId ? 'Đang từ chối...' : 'Từ chối'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        {(() => {
                          const isCallLog = message.meta?.isCallLog
                          const productSuggestions = parseProductSuggestions(message)
                          return (
                            <div
                              className={`max-w-[78%] rounded-2xl px-3 py-2 shadow-sm ${
                                isCallLog 
                                  ? isAdmin ? 'bg-green-100 text-green-900 border border-green-200' : 'bg-gray-100 text-gray-900 border border-gray-200'
                                  : isAdmin
                                    ? 'bg-green-600 text-white'
                                    : isUser
                                      ? 'bg-white text-gray-800'
                                      : 'bg-blue-600 text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isCallLog && <FontAwesomeIcon icon={faVideo} className={`text-sm ${isAdmin ? 'text-green-600' : 'text-gray-600'}`} />}
                                <p className="text-sm leading-5 whitespace-pre-wrap font-medium">{message.content}</p>
                              </div>
                              {imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => openImagePreview(imageUrl)}
                                  className="mt-2 block overflow-hidden rounded-lg border border-white/20"
                                >
                                  <img src={imageUrl} alt="Anh dinh kem" className="max-h-40 w-full object-cover" />
                                </button>
                              )}
                              {productSuggestions.length > 0 && (
                                <div className="mt-3 grid gap-2.5">
                                  {productSuggestions.map((product) => (
                                    <div
                                      key={`${message.id}_${product.id!}`}
                                      className="flex items-center gap-3 rounded-xl border border-white/20 bg-black/10 p-2.5 text-left"
                                    >
                                      {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.productName} className="h-12 w-12 rounded-lg border border-white/20 object-cover bg-white" />
                                      ) : (
                                        <div className="h-12 w-12 rounded-lg border border-white/20 bg-white/20" />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-xs font-semibold">{product.productName}</p>
                                        {product.price !== undefined && (
                                          <p className="mt-0.5 text-xs font-bold text-yellow-300">{toCurrencyVnd(product.price)}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className={`mt-2 text-[10px] ${isCallLog ? (isAdmin ? 'text-green-500' : 'text-gray-500') : (isAdmin || !isUser ? 'text-white/80' : 'text-gray-500')}`}>
                                {message.senderName || (isAdmin ? currentUserName : isUser ? 'Khách hàng' : 'AI')} • {formatDateTime(message.createdAt)}
                              </p>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('admin:initiate-consultation-call', {
                            detail: {
                                peerId: selectedConversation.clientId || (selectedConversation.client as any)?._id || selectedConversation.client?.id,
                                peerName: selectedConversation.client?.fullName || 'Khách hàng',
                                callType: 'video',
                                consultationId: selectedConversation.id
                            }
                        }))
                    }}
                    disabled={selectedConversation.status === 'closed' || sendingMessage}
                    className="h-10 w-10 shrink-0 flex items-center justify-center rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
                    title="Gọi Video"
                  >
                    <FontAwesomeIcon icon={faVideo} />
                  </button>
                  <input
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void sendMessage()
                      }
                    }}
                    disabled={selectedConversation.status === 'closed' || sendingMessage}
                    placeholder={selectedConversation.status === 'closed' ? 'Hội thoại đã đóng' : 'Nhập tin nhắn phản hồi...'}
                    className="h-10 flex-1 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void sendMessage()
                    }}
                    disabled={sendingMessage || !messageDraft.trim() || selectedConversation.status === 'closed'}
                    className="h-10 px-4 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Gui
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Goi nhanh khach hang</h2>
          <button
            type="button"
            onClick={() => {
              void loadCustomers()
            }}
            className="px-2.5 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Làm mới
          </button>
        </div>

        {loadingCustomers ? (
          <div className="p-8 text-center text-sm text-gray-500">Dang tai danh sach khach hang...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-5xl mb-3 text-blue-500"><FontAwesomeIcon icon={faUsers} /></div>
            <p className="text-sm">Không có khach hang nao.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {customers.map((customer) => (
              <div key={customer.id} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-900 truncate">{customer.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                </div>
                <p className="text-xs text-gray-500">Chi goi trong lich tu van da xác nhận.</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {imagePreviewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={closeImagePreview}
        >
          <div
            className="relative max-h-full max-w-[90vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute right-2 top-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustPreviewScale(-0.2)}
                className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 shadow"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => adjustPreviewScale(0.2)}
                className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 shadow"
              >
                +
              </button>
              <button
                type="button"
                onClick={closeImagePreview}
                className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 shadow"
              >
                Dong
              </button>
            </div>
            <img
              src={imagePreviewUrl}
              alt="Anh phong to"
              style={{ transform: `scale(${imagePreviewScale})` }}
              className="max-h-[85vh] max-w-[90vw] origin-center rounded-xl bg-white/10 object-contain shadow-2xl"
              onWheel={(event) => {
                event.preventDefault()
                adjustPreviewScale(event.deltaY > 0 ? -0.2 : 0.2)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
