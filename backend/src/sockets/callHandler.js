const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const Consultation = require('../models/consultation.model')
const ChatConversation = require('../models/chatConversation.model')
const registerChatHandlers = require('./chatHandler')

// Theo dõi người dùng đang online: userId -> { userId, role, name, socketIds:Set }
const onlineUsers = new Map()
const callSessions = new Map()
const busyUsers = new Set()

const CALL_WINDOW_MINUTES = Math.max(1, Number(process.env.CALL_WINDOW_MINUTES || 60))
const ALLOW_OFFLINE_CALLS = process.env.ALLOW_OFFLINE_CALLS === 'true'

const serializeOnlineUsers = () =>
    Array.from(onlineUsers.values()).map((user) => ({
        userId: user.userId,
        role: user.role,
        name: user.name,
        socketCount: user.socketIds.size,
    }))

const normalizeUserId = (value) => String(value || '')

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value)

const isWithinCallWindow = (consultationDate) => {
    if (!consultationDate) return false
    const consultationTime = new Date(consultationDate).getTime()
    if (Number.isNaN(consultationTime)) return false

    const diffMs = Math.abs(consultationTime - Date.now())
    return diffMs <= CALL_WINDOW_MINUTES * 60 * 1000
}

const isAllowedCallType = (consultationType, callType) => {
    if (consultationType === 'phone') return callType === 'voice'
    if (consultationType === 'offline') return ALLOW_OFFLINE_CALLS
    return true
}

const fetchConsultation = async (consultationId) => {
    if (!isValidObjectId(consultationId)) return null
    return Consultation.findById(consultationId).lean()
}

const validateCallPermission = async ({ consultationId, callerId, targetUserId, callType }) => {
    if (!consultationId) {
        return { ok: false, reason: 'CONSULTATION_REQUIRED' }
    }

    let consultation = await fetchConsultation(consultationId)
    let consultationUserId = null
    let consultationStaffId = null
    let isChatContext = false

    if (consultation) {
        if (consultation.status !== 'confirmed') {
            return { ok: false, reason: 'CONSULTATION_NOT_CONFIRMED' }
        }
        if (!consultation.assignedStaff) {
            return { ok: false, reason: 'CONSULTATION_NOT_ASSIGNED' }
        }
        if (!isWithinCallWindow(consultation.consultationDate)) {
            return { ok: false, reason: 'CONSULTATION_OUT_OF_WINDOW' }
        }
        if (!isAllowedCallType(consultation.consultationType, callType)) {
            return { ok: false, reason: 'CALL_TYPE_NOT_ALLOWED' }
        }
        consultationUserId = normalizeUserId(consultation.userId)
        consultationStaffId = normalizeUserId(consultation.assignedStaff)
    } else {
        // Fallback: Check if it's a Chat Conversation ID instead of a Consultation Booking
        consultation = await ChatConversation.findById(consultationId).lean()
        if (!consultation) {
            return { ok: false, reason: 'CONSULTATION_NOT_FOUND' }
        }
        if (consultation.status !== 'human') {
            return { ok: false, reason: 'CONSULTATION_NOT_CONFIRMED' }
        }
        if (!consultation.assignedStaffId) {
            return { ok: false, reason: 'CONSULTATION_NOT_ASSIGNED' }
        }
        isChatContext = true
        consultationUserId = normalizeUserId(consultation.clientId)
        consultationStaffId = normalizeUserId(consultation.assignedStaffId)
    }

    const normalizedCallerId = normalizeUserId(callerId)
    const normalizedTargetId = normalizeUserId(targetUserId)

    const isClientCallingStaff =
        normalizedCallerId === consultationUserId && normalizedTargetId === consultationStaffId
    const isStaffCallingClient =
        normalizedCallerId === consultationStaffId && normalizedTargetId === consultationUserId

    if (!isClientCallingStaff && !isStaffCallingClient) {
        return { ok: false, reason: 'CONSULTATION_CALL_FORBIDDEN' }
    }

    return {
        ok: true,
        consultation,
        consultationUserId,
        consultationStaffId,
        isChatContext,
    }
}

const completeConsultationIfNeeded = async (session) => {
    if (!session || !session.accepted || !session.consultationId) return
    if (!isValidObjectId(session.consultationId)) return

    const consultation = await Consultation.findById(session.consultationId)
    if (!consultation) return
    if (consultation.status !== 'confirmed') return

    consultation.status = 'completed'
    consultation.completedAt = new Date()
    await consultation.save()
}

const isUserOnline = (userId) => {
    const normalized = normalizeUserId(userId)
    if (!normalized) return false

    const onlineUser = onlineUsers.get(normalized)
    return Boolean(onlineUser && onlineUser.socketIds && onlineUser.socketIds.size > 0)
}

const setUserBusy = (userId, isBusy) => {
    const normalized = normalizeUserId(userId)
    if (!normalized) return

    if (isBusy) {
        busyUsers.add(normalized)
        return
    }

    busyUsers.delete(normalized)
}

const releaseCallSession = (callId) => {
    const normalizedCallId = normalizeUserId(callId)
    if (!normalizedCallId) return null

    const session = callSessions.get(normalizedCallId)
    if (!session) return null

    callSessions.delete(normalizedCallId)
    setUserBusy(session.callerId, false)
    setUserBusy(session.calleeId, false)

    return session
}

const logCallToChat = async (io, session, status, reason = '') => {
    if (!session || !session.isChatContext || !session.consultationId) return;
    try {
        const ChatMessage = require('../models/chatMessage.model');
        const duration = session.acceptedAt ? Math.round((new Date() - session.acceptedAt) / 1000) : 0;
        
        let content = 'Cuộc gọi video đã kết thúc.';
        if (status === 'missed') {
            content = 'Cuộc gọi nhỡ.';
        } else if (status === 'declined') {
            content = 'Cuộc gọi bị từ chối.';
        } else if (status === 'cancelled') {
            content = 'Cuộc gọi bị hủy.';
        } else if (status === 'ended') {
            const m = Math.floor(duration / 60);
            const s = duration % 60;
            content = `Cuộc gọi video đã kết thúc. Thời lượng: ${m} phút ${s} giây.`;
        }
        
        const message = await ChatMessage.create({
            conversationId: session.consultationId,
            senderType: 'system',
            content: content,
            meta: { callId: session.callId, status, duration, reason }
        });

        // Tái sử dụng emitToSupportStaff nếu cần, nhưng đơn giản nhất là emit thẳng vào room
        const room = `chat:conversation:${session.consultationId}`;
        const serializedMessage = {
            id: String(message._id),
            conversationId: String(message.conversationId),
            senderType: message.senderType,
            senderId: null,
            senderName: '',
            content: message.content,
            intent: '',
            action: '',
            meta: message.meta || {},
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
        };

        io.to(room).emit('chat:message:new', {
            conversationId: session.consultationId,
            message: serializedMessage
        });
    } catch (error) {
        console.error('[Call Log] Error saving call log to chat:', error);
    }
}

const setupCallHandlers = (io) => {
    // ==================== 1. MIDDLEWARE XÁC THỰC ====================
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]

        if (!token) {
            console.log('[Socket] No token provided')
            return next(new Error('Authentication error: No token provided'))
        }

        try {
            const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token
            const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'dev-secret-change-me')

            const resolvedUserId = decoded.userId || decoded.id || decoded.sub || decoded._id
            if (!resolvedUserId) {
                return next(new Error('Authentication error: Missing userId in token'))
            }

            socket.userId = String(resolvedUserId)
            socket.userRole = decoded.role
            socket.userName = decoded.fullName || decoded.name || 'Người dùng'

            next()
        } catch (err) {
            console.error('[Socket] Auth error:', err.message)
            return next(new Error('Authentication error: Invalid token'))
        }
    })

    // ==================== 2. XỬ LÝ KẾT NỐI ====================
    io.on('connection', (socket) => {
        console.log(`✅ Khách kết nối: ${socket.id} (User: ${socket.userName} - ID: ${socket.userId})`)

        // Đưa socket vào room userId sau khi đã kết nối thành công.
        socket.join(socket.userId)

        // Lưu nhiều socket cho cùng 1 user (multi-tab / multi-device).
        const existingUser = onlineUsers.get(socket.userId)
        if (existingUser) {
            existingUser.socketIds.add(socket.id)
            existingUser.role = socket.userRole || existingUser.role
            existingUser.name = socket.userName || existingUser.name
        } else {
            onlineUsers.set(socket.userId, {
                userId: socket.userId,
                role: socket.userRole,
                name: socket.userName,
                socketIds: new Set([socket.id]),
            })
        }
        
        // Báo cho toàn hệ thống biết có người mới online (để update UI danh sách người gọi)
        io.emit('online-users:update', serializeOnlineUsers())

        // Lấy danh sách người dùng online
        socket.on('get-online-users', (callback) => {
            if (typeof callback === 'function') {
                callback(serializeOnlineUsers())
            }
        })

        // ==================== 3. CHAT AI + HUMAN SUPPORT ====================
        registerChatHandlers({ io, socket, onlineUsers })

        // ==================== 4. CALL SIGNALING FOR PEERJS ====================
        // Caller asks server to notify target user about a new incoming call.
        socket.on('call:make', async (payload = {}, callback) => {
            console.log('[CALL-DEBUG] 4. call:make received from:', socket.userId)
            console.log('[CALL-DEBUG] 4b. payload:', JSON.stringify(payload))

            const targetUserId = normalizeUserId(payload.targetUserId)
            const callId = payload.callId
            const callType = payload.callType === 'voice' ? 'voice' : 'video'
            const callerUserId = normalizeUserId(socket.userId)
            const consultationId = normalizeUserId(payload.consultationId)

            if (!targetUserId || !callId) {
                if (typeof callback === 'function') {
                    callback({ ok: false, reason: 'INVALID_PAYLOAD' })
                }
                return
            }

            const permission = await validateCallPermission({
                consultationId,
                callerId: callerUserId,
                targetUserId,
                callType,
            })

            console.log('[CALL-DEBUG] 4c. permission:', JSON.stringify(permission))

            if (!permission.ok) {
                socket.emit('call:unavailable', {
                    callId,
                    targetUserId,
                    reason: permission.reason,
                })

                if (typeof callback === 'function') {
                    callback({ ok: false, reason: permission.reason })
                }
                return
            }

            if (!isUserOnline(targetUserId)) {
                socket.emit('call:unavailable', {
                    callId,
                    targetUserId,
                    reason: 'TARGET_OFFLINE',
                })

                if (typeof callback === 'function') {
                    callback({ ok: false, reason: 'TARGET_OFFLINE' })
                }
                return
            }

            if (busyUsers.has(targetUserId) || busyUsers.has(callerUserId)) {
                socket.emit('user-busy', {
                    callId,
                    targetUserId,
                    reason: 'USER_BUSY',
                })

                if (typeof callback === 'function') {
                    callback({ ok: false, reason: 'USER_BUSY' })
                }
                return
            }

            callSessions.set(callId, {
                callId,
                callerId: callerUserId,
                calleeId: targetUserId,
                consultationId,
                accepted: false,
                callType,
                isChatContext: permission.isChatContext,
                startedAt: new Date(),
            })
            setUserBusy(callerUserId, true)
            setUserBusy(targetUserId, true)

            socket.to(targetUserId).emit('call:incoming', {
                callId,
                callerId: socket.userId.toString(),
                callType,
                callerPeerId: normalizeUserId(payload.callerPeerId || socket.userId),
                callerData: payload.callerData || {
                    userId: socket.userId.toString(),
                    name: socket.userName,
                    role: socket.userRole,
                },
            })

            if (typeof callback === 'function') {
                callback({ ok: true })
            }
        })

        socket.on('call:accept', (payload = {}) => {
            const targetUserId = normalizeUserId(payload.targetUserId)
            const callId = payload.callId
            if (!targetUserId || !callId) return

            const session = callSessions.get(normalizeUserId(callId))
            if (session) {
                session.accepted = true
                session.acceptedAt = new Date()
            }

            socket.to(targetUserId).emit('call:accepted', {
                callId,
                calleeId: socket.userId.toString(),
                calleePeerId: normalizeUserId(payload.calleePeerId || socket.userId),
                calleeData: payload.calleeData || {
                    userId: socket.userId.toString(),
                    name: socket.userName,
                    role: socket.userRole,
                },
            })
        })

        socket.on('call:decline', (payload = {}) => {
            const targetUserId = normalizeUserId(payload.targetUserId)
            const callId = payload.callId
            if (!targetUserId || !callId) return

            const session = releaseCallSession(callId)
            if (session) {
                logCallToChat(io, session, 'declined');
            }

            socket.to(targetUserId).emit('call:declined', {
                callId,
                senderId: socket.userId.toString(),
            })
        })

        socket.on('call:cancel', (payload = {}) => {
            const targetUserId = normalizeUserId(payload.targetUserId)
            const callId = payload.callId
            if (!targetUserId || !callId) return

            const session = releaseCallSession(callId)
            if (session) {
                logCallToChat(io, session, 'cancelled');
            }

            socket.to(targetUserId).emit('call:cancelled', {
                callId,
                senderId: socket.userId.toString(),
            })
        })

        socket.on('call:end', (payload = {}) => {
            const targetUserId = normalizeUserId(payload.targetUserId)
            const callId = payload.callId
            if (!targetUserId || !callId) return

            const session = releaseCallSession(callId)
            if (session) {
                void completeConsultationIfNeeded(session).catch((error) => {
                    console.error('[Call] Auto-complete consultation failed:', error)
                })
                logCallToChat(io, session, 'ended');
            }

            socket.to(targetUserId).emit('call:end', {
                callId,
                senderId: socket.userId.toString(),
            })
        })

        socket.on('call-timeout', (payload = {}) => {
            const targetUserId = normalizeUserId(payload.targetUserId)
            const callId = payload.callId
            if (!targetUserId || !callId) return

            const session = releaseCallSession(callId)
            if (session) {
                logCallToChat(io, session, 'missed', payload.reason || 'NO_ANSWER');
            }

            socket.to(targetUserId).emit('call-timeout', {
                callId,
                senderId: socket.userId.toString(),
                reason: payload.reason || 'NO_ANSWER',
            })
        })

        // ==================== 5. NGẮT KẾT NỐI ====================
        socket.on('disconnect', () => {
            console.log(`🔌 Khách rời đi: ${socket.id} (User ID: ${socket.userId})`)

            const disconnectedUserId = normalizeUserId(socket.userId)
            const disconnectedSessions = []

            callSessions.forEach((session, sessionId) => {
                if (session.callerId === disconnectedUserId || session.calleeId === disconnectedUserId) {
                    disconnectedSessions.push({ sessionId, session })
                }
            })

            disconnectedSessions.forEach(({ sessionId, session }) => {
                const sessionSnapshot = releaseCallSession(sessionId)

                const otherUserId =
                    session.callerId === disconnectedUserId ? session.calleeId : session.callerId

                if (sessionSnapshot) {
                    void completeConsultationIfNeeded(sessionSnapshot).catch((error) => {
                        console.error('[Call] Auto-complete consultation failed:', error)
                    })
                    const status = session.accepted ? 'ended' : 'missed';
                    logCallToChat(io, sessionSnapshot, status, 'USER_DISCONNECTED');
                }

                socket.to(otherUserId).emit('call:end', {
                    callId: sessionId,
                    senderId: disconnectedUserId,
                    reason: 'USER_DISCONNECTED',
                })
            })

            setUserBusy(disconnectedUserId, false)

            const existingUser = onlineUsers.get(socket.userId)
            if (existingUser) {
                existingUser.socketIds.delete(socket.id)
                if (existingUser.socketIds.size === 0) {
                    onlineUsers.delete(socket.userId)
                }
            }

            // Báo lại danh sách online mới nhất rà soát UI
            io.emit('online-users:update', serializeOnlineUsers())
        })
    })

    console.log('✅ Socket.io Call Handlers Initialized (PeerJS Mode)')
}

module.exports = setupCallHandlers
module.exports.onlineUsers = onlineUsers
