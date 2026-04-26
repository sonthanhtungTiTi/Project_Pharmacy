import { useCallback, useEffect, useMemo, useState } from 'react'
import io, { type Socket } from 'socket.io-client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPhone, faUsers, faVideo } from '@fortawesome/free-solid-svg-icons'
import adminUserService from '../services/admin-user.service'
import type { AdminUserItem } from '../services/admin-user.service'
import adminChatService, {
	type ChatConversation,
	type ChatConversationListItem,
	type ChatConversationStatus,
	type ChatMessage,
} from '../services/admin-chat.service'

const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '')

const statusLabelMap: Record<'all' | ChatConversationStatus, string> = {
	all: 'Tat ca',
	ai: 'AI',
	human_pending: 'Cho nhan vien',
	human: 'Dang co nhan vien',
	closed: 'Da dong',
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

const toConversationListItem = (
	conversation: ChatConversation,
	latestMessage: ChatConversationListItem['latestMessage'] | null,
): ChatConversationListItem => ({
	...conversation,
	latestMessage,
})

export default function Support() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentUserName, setCurrentUserName] = useState('Nhan vien')
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

  const selectedConversation = useMemo(() => {
    return conversations.find((item) => item.id === selectedConversationId) || null
  }, [conversations, selectedConversationId])

  useEffect(() => {
    const userRaw = localStorage.getItem('adminUser')
    if (userRaw) {
      try {
        const parsed = JSON.parse(userRaw) as { fullName?: string; name?: string; email?: string }
        setCurrentUserName(parsed.fullName || parsed.name || parsed.email || 'Nhan vien')
      } catch {
        setCurrentUserName('Nhan vien')
      }
    }

    const token = localStorage.getItem('adminAccessToken')
    if (!token) {
      return
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
      setSocket(null)
    }
  }, [])

  const emitWithAck = useCallback(
    <T,>(eventName: string, payload: Record<string, unknown>) => {
      return new Promise<T>((resolve, reject) => {
        if (!socket) {
          reject(new Error('Mat ket noi realtime'))
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
      const message = error instanceof Error ? error.message : 'Khong the tai danh sach hoi thoai'
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
      const message = error instanceof Error ? error.message : 'Khong the tai tin nhan'
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

  const initiateVideoCall = (customerId: string, customerName: string) => {
    window.dispatchEvent(new CustomEvent('admin:initiate-call', {
      detail: { peerId: customerId, peerName: customerName, callType: 'video' }
    }))
  }

  const initiateVoiceCall = (customerId: string, customerName: string) => {
    window.dispatchEvent(new CustomEvent('admin:initiate-call', {
      detail: { peerId: customerId, peerName: customerName, callType: 'voice' }
    }))
  }

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
      const message = error instanceof Error ? error.message : 'Khong the nhan hoi thoai'
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
      const message = error instanceof Error ? error.message : 'Khong the dong hoi thoai'
      setChatError(message)
    } finally {
      setClosingConversation(false)
    }
  }

  const sendMessage = async () => {
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
      if (!socket?.connected) {
        throw new Error('Can ket noi realtime de gui tin nhan')
      }

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
      const message = error instanceof Error ? error.message : 'Khong the gui tin nhan'
      setChatError(message)
      setMessageDraft(content)
    } finally {
      setSendingMessage(false)
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
        <p className="text-gray-600 mt-1">Theo dõi hội thoại AI, tham gia hỗ trợ realtime và gọi trực tiếp cho khách hàng.</p>
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
              Lam moi
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
              placeholder="Tim theo ten, email, session..."
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
              <div className="p-6 text-sm text-center text-gray-500">Dang tai hoi thoai...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-sm text-center text-gray-500">Chua co hoi thoai nao</div>
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
                          {conversation.client?.fullName || 'Khach hang'}
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
                      {conversation.latestMessage?.content || 'Chua co tin nhan'}
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
              Chon mot hoi thoai o cot ben trai de bat dau ho tro.
            </div>
          ) : (
            <>
              <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {selectedConversation.client?.fullName || 'Khach hang'}
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
                      {joiningConversation ? 'Dang nhan...' : 'Nhan ho tro'}
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
                      {closingConversation ? 'Dang dong...' : 'Dong hoi thoai'}
                    </button>
                  )}
                </div>
              </div>

              <div className="h-[420px] overflow-y-auto bg-gray-50 px-4 py-3 space-y-2">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Dang tai tin nhan...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Hoi thoai nay chua co tin nhan.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isSystem = message.senderType === 'system'
                    const isAdmin = message.senderType === 'admin'
                    const isUser = message.senderType === 'user'

                    if (isSystem) {
                      return (
                        <div key={message.id} className="rounded-md bg-amber-50 text-amber-700 text-xs text-center px-3 py-2">
                          {message.content}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-3 py-2 shadow-sm ${
                            isAdmin
                              ? 'bg-green-600 text-white'
                              : isUser
                                ? 'bg-white text-gray-800'
                                : 'bg-blue-600 text-white'
                          }`}
                        >
                          <p className="text-sm leading-5">{message.content}</p>
                          <p className={`mt-1 text-[10px] ${isAdmin || !isUser ? 'text-white/80' : 'text-gray-500'}`}>
                            {message.senderName || (isAdmin ? currentUserName : isUser ? 'Khach hang' : 'AI')} • {formatDateTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="border-t border-gray-200 p-3">
                <div className="flex items-center gap-2">
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
                    placeholder={selectedConversation.status === 'closed' ? 'Hoi thoai da dong' : 'Nhap tin nhan phan hoi...'}
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
            Lam moi
          </button>
        </div>

        {loadingCustomers ? (
          <div className="p-8 text-center text-sm text-gray-500">Dang tai danh sach khach hang...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-5xl mb-3 text-blue-500"><FontAwesomeIcon icon={faUsers} /></div>
            <p className="text-sm">Khong co khach hang nao de goi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {customers.map((customer) => (
              <div key={customer.id} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-900 truncate">{customer.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => initiateVideoCall(customer.id, customer.fullName)}
                    className="flex-1 px-3 py-2 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition font-medium"
                    title="Goi video"
                  >
                    <FontAwesomeIcon icon={faVideo} className="mr-1" />
                    Video
                  </button>
                  <button
                    onClick={() => initiateVoiceCall(customer.id, customer.fullName)}
                    className="flex-1 px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition font-medium"
                    title="Goi dien thoai"
                  >
                    <FontAwesomeIcon icon={faPhone} className="mr-1" />
                    Dien thoai
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
