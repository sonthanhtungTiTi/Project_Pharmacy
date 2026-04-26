/* eslint-disable @typescript-eslint/no-explicit-any */
import Peer, { type MediaConnection, type PeerJSOption } from 'peerjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type CallPhase = 'IDLE' | 'RINGING' | 'IN_CALL' | 'ENDED'
export type RingingDirection = 'incoming' | 'outgoing' | null

export interface IncomingCallData {
    callId: string
    callerId: string
    callerPeerId: string
    callerName: string
    callerAvatarUrl?: string
    callType: 'video' | 'voice'
}

interface UseWebRTCOptions {
    onPhaseChange?: (phase: CallPhase) => void
    onIncomingCall?: (data: IncomingCallData) => void
}

interface ActiveCallSession {
    callId: string
    targetUserId: string
    targetPeerId: string
    direction: 'incoming' | 'outgoing'
    callType: 'video' | 'voice'
}

const SIGNALING_EVENTS = {
    make: 'call:make',
    incoming: 'call:incoming',
    accept: 'call:accept',
    accepted: 'call:accepted',
    decline: 'call:decline',
    declined: 'call:declined',
    unavailable: 'call:unavailable',
    busy: 'user-busy',
    cancel: 'call:cancel',
    cancelled: 'call:cancelled',
    end: 'call:end',
    timeout: 'call-timeout',
} as const

const OUTGOING_RING_TIMEOUT_MS = 30_000

const RTC_ICE_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
    ],
}

const generateCallId = () => `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
const normalizeCallType = (callType: string | undefined): 'video' | 'voice' =>
    callType === 'voice' ? 'voice' : 'video'
const normalizeUserId = (value: unknown): string => String(value || '')

const getUserId = (user: any): string => normalizeUserId(user?.userId || user?._id || user?.id)
const getUserName = (user: any): string => user?.fullName || user?.name || 'Nguoi dung'
const getUserAvatar = (user: any): string | undefined => user?.profilePic || user?.avatarUrl

const getPeerOptions = (): PeerJSOption => {
    const inferredHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    const host = import.meta.env.VITE_PEER_HOST || inferredHost
    const path = import.meta.env.VITE_PEER_PATH || '/myapp'
    const portRaw = import.meta.env.VITE_PEER_PORT || '9000'
    const secureRaw = import.meta.env.VITE_PEER_SECURE

    const parsedPort = Number(portRaw)
    const isLocalHost = host === 'localhost' || host === '127.0.0.1'
    const inferredSecure = !isLocalHost && typeof window !== 'undefined' && window.location.protocol === 'https:'

    const options: PeerJSOption = {
        host,
        path,
        port: Number.isNaN(parsedPort) ? 9000 : parsedPort,
        secure: secureRaw !== undefined ? secureRaw === 'true' : inferredSecure,
        debug: 1,
        config: RTC_ICE_CONFIG,
    }

    return options
}

const stopMediaStream = (stream: MediaStream | null) => {
    if (!stream) return
    stream.getTracks().forEach((track) => track.stop())
}

const getMediaCallId = (mediaCall: MediaConnection): string =>
    normalizeUserId(mediaCall?.metadata?.callId)

export const useWebRTC = (socket: any, user: any, options?: UseWebRTCOptions) => {
    const [phase, setPhase] = useState<CallPhase>('IDLE')
    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOn, setIsVideoOn] = useState(false)
    const [callType, setCallType] = useState<'video' | 'voice'>('video')
    const [ringingDirection, setRingingDirection] = useState<RingingDirection>(null)
    const [isPeerReady, setIsPeerReady] = useState(false)

    const peerRef = useRef<Peer | null>(null)
    const peerReadyRef = useRef(false)
    const activeMediaCallRef = useRef<MediaConnection | null>(null)
    const pendingIncomingMediaCallRef = useRef<MediaConnection | null>(null)
    const localStreamRef = useRef<MediaStream | null>(null)
    const remoteStreamRef = useRef<MediaStream | null>(null)
    const currentCallRef = useRef<ActiveCallSession | null>(null)
    const shouldAnswerCallIdRef = useRef<string | null>(null)
    const incomingCallRef = useRef<IncomingCallData | null>(null)
    const optionsRef = useRef<UseWebRTCOptions | undefined>(options)
    const phaseRef = useRef<CallPhase>('IDLE')
    const cleanupInProgressRef = useRef(false)
    const endedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const outgoingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const userId = useMemo(() => getUserId(user), [user])

    const setCallPhase = useCallback((nextPhase: CallPhase) => {
        phaseRef.current = nextPhase
        setPhase(nextPhase)
        optionsRef.current?.onPhaseChange?.(nextPhase)
    }, [])

    const clearEndedTimer = useCallback(() => {
        if (!endedTimerRef.current) return
        clearTimeout(endedTimerRef.current)
        endedTimerRef.current = null
    }, [])

    const clearOutgoingTimeout = useCallback(() => {
        if (!outgoingTimeoutRef.current) return
        clearTimeout(outgoingTimeoutRef.current)
        outgoingTimeoutRef.current = null
    }, [])

    const markEndedThenIdle = useCallback(() => {
        clearEndedTimer()
        setCallPhase('ENDED')

        endedTimerRef.current = setTimeout(() => {
            if (phaseRef.current === 'ENDED') {
                setCallPhase('IDLE')
            }
        }, 400)
    }, [clearEndedTimer, setCallPhase])

    const closeMediaConnections = useCallback(() => {
        const activeMediaCall = activeMediaCallRef.current
        activeMediaCallRef.current = null
        if (activeMediaCall) {
            try {
                activeMediaCall.close()
            } catch {
                return
            }
        }

        const pendingMediaCall = pendingIncomingMediaCallRef.current
        pendingIncomingMediaCallRef.current = null
        if (pendingMediaCall && pendingMediaCall !== activeMediaCall) {
            try {
                pendingMediaCall.close()
            } catch {
                return
            }
        }
    }, [])

    const cleanupStreams = useCallback(() => {
        stopMediaStream(localStreamRef.current)
        localStreamRef.current = null

        stopMediaStream(remoteStreamRef.current)
        remoteStreamRef.current = null

        setLocalStream(null)
        setRemoteStream(null)
        setIsMuted(false)
        setIsVideoOn(false)
    }, [])

    const resetCallRefs = useCallback(() => {
        setIncomingCall(null)
        incomingCallRef.current = null
        currentCallRef.current = null
        shouldAnswerCallIdRef.current = null
        setRingingDirection(null)
    }, [])

    const resetCallState = useCallback(
        (nextPhase: 'IDLE' | 'ENDED' = 'ENDED') => {
            cleanupInProgressRef.current = true
            clearOutgoingTimeout()

            closeMediaConnections()
            cleanupStreams()
            resetCallRefs()

            if (nextPhase === 'ENDED') {
                markEndedThenIdle()
            } else {
                clearEndedTimer()
                setCallPhase('IDLE')
            }

            setTimeout(() => {
                cleanupInProgressRef.current = false
            }, 0)
        },
        [cleanupStreams, closeMediaConnections, markEndedThenIdle, clearEndedTimer, clearOutgoingTimeout, resetCallRefs, setCallPhase]
    )

    const startOutgoingTimeout = useCallback(
        (callId: string, targetUserId: string) => {
            clearOutgoingTimeout()

            outgoingTimeoutRef.current = setTimeout(() => {
                const currentCall = currentCallRef.current

                if (!currentCall) return
                if (currentCall.callId !== callId) return
                if (currentCall.direction !== 'outgoing') return
                if (phaseRef.current !== 'RINGING') return

                socket?.emit(SIGNALING_EVENTS.timeout, {
                    callId,
                    targetUserId,
                    reason: 'NO_ANSWER',
                })

                resetCallState('ENDED')
            }, OUTGOING_RING_TIMEOUT_MS)
        },
        [clearOutgoingTimeout, resetCallState, socket]
    )

    const initializeUserMedia = useCallback(async (enableVideo: boolean) => {
        if (localStreamRef.current) {
            return localStreamRef.current
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: enableVideo
                    ? {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    }
                    : false,
            })

            localStreamRef.current = stream
            setLocalStream(stream)
            setIsVideoOn(enableVideo && stream.getVideoTracks().length > 0)
            return stream
        } catch {
            if (!enableVideo) {
                throw new Error('Khong the truy cap microphone')
            }

            const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            })

            localStreamRef.current = audioOnlyStream
            setLocalStream(audioOnlyStream)
            setIsVideoOn(false)
            return audioOnlyStream
        }
    }, [])

    const attachMediaCall = useCallback(
        (mediaCall: MediaConnection, callId: string) => {
            activeMediaCallRef.current = mediaCall
            pendingIncomingMediaCallRef.current = null

            mediaCall.on('stream', (stream) => {
                remoteStreamRef.current = stream
                setRemoteStream(stream)
                setRingingDirection(null)
                setCallPhase('IN_CALL')
            })

            mediaCall.on('close', () => {
                if (cleanupInProgressRef.current) return
                if (currentCallRef.current?.callId && currentCallRef.current.callId !== callId) return
                resetCallState('ENDED')
            })

            mediaCall.on('error', () => {
                if (cleanupInProgressRef.current) return
                resetCallState('ENDED')
            })
        },
        [resetCallState, setCallPhase]
    )

    const answerIncomingPeerCall = useCallback(
        async (mediaCall: MediaConnection) => {
            const callId = getMediaCallId(mediaCall)
            if (!callId || !currentCallRef.current || currentCallRef.current.callId !== callId) return

            const stream = await initializeUserMedia(currentCallRef.current.callType === 'video')
            attachMediaCall(mediaCall, callId)
            mediaCall.answer(stream)
            shouldAnswerCallIdRef.current = null
            setIncomingCall(null)
            incomingCallRef.current = null
        },
        [attachMediaCall, initializeUserMedia]
    )

    const handlePeerIncomingCall = useCallback(
        async (mediaCall: MediaConnection) => {
            const callId = getMediaCallId(mediaCall)
            const expectedCallId = currentCallRef.current?.callId || incomingCallRef.current?.callId

            if (!callId || !expectedCallId || callId !== expectedCallId) {
                try {
                    mediaCall.close()
                } catch {
                    return
                }
                return
            }

            pendingIncomingMediaCallRef.current = mediaCall

            if (shouldAnswerCallIdRef.current === callId) {
                try {
                    await answerIncomingPeerCall(mediaCall)
                } catch {
                    resetCallState('ENDED')
                }
            }
        },
        [answerIncomingPeerCall, resetCallState]
    )

    const isCurrentCall = useCallback((callId?: string) => {
        const activeCallId = currentCallRef.current?.callId || incomingCallRef.current?.callId
        if (!activeCallId) return false
        if (!callId) return true
        return activeCallId === normalizeUserId(callId)
    }, [])

    const initiateCall = useCallback(
        async (peerId: string, _peerName: string, type: 'video' | 'voice' = 'video') => {
            const targetUserId = normalizeUserId(peerId)
            if (!socket || !targetUserId || !userId) {
                return
            }

            if (!peerRef.current || !peerReadyRef.current) {
                throw new Error('Peer connection chua san sang')
            }

            try {
                const normalizedType = normalizeCallType(type)
                await initializeUserMedia(normalizedType === 'video')

                setCallType(normalizedType)
                setRingingDirection('outgoing')

                const callId = generateCallId()
                currentCallRef.current = {
                    callId,
                    targetUserId,
                    targetPeerId: targetUserId,
                    direction: 'outgoing',
                    callType: normalizedType,
                }

                setCallPhase('RINGING')

                const ack = await new Promise<{ ok?: boolean }>((resolve) => {
                    let settled = false
                    const timeout = setTimeout(() => {
                        if (!settled) {
                            settled = true
                            resolve({ ok: false })
                        }
                    }, 6000)

                    socket.emit(
                        SIGNALING_EVENTS.make,
                        {
                            callId,
                            targetUserId,
                            callType: normalizedType,
                            callerPeerId: userId,
                            callerData: {
                                userId,
                                name: getUserName(user),
                                avatar: getUserAvatar(user),
                            },
                        },
                        (response: { ok?: boolean }) => {
                            if (settled) return
                            settled = true
                            clearTimeout(timeout)
                            resolve(response || { ok: false })
                        }
                    )
                })

                if (!ack?.ok) {
                    resetCallState('ENDED')
                    return
                }

                startOutgoingTimeout(callId, targetUserId)
            } catch (error) {
                resetCallState('ENDED')
                throw error
            }
        },
        [initializeUserMedia, resetCallState, setCallPhase, socket, startOutgoingTimeout, user, userId]
    )

    const answerCall = useCallback(async () => {
        const callToAnswer = incomingCallRef.current
        const activeCall = currentCallRef.current

        if (!callToAnswer || !activeCall || !socket || !userId) return

        try {
            setCallType(callToAnswer.callType)
            setRingingDirection('incoming')

            await initializeUserMedia(callToAnswer.callType === 'video')

            shouldAnswerCallIdRef.current = callToAnswer.callId
            setIncomingCall(null)
            incomingCallRef.current = null

            socket.emit(SIGNALING_EVENTS.accept, {
                callId: callToAnswer.callId,
                targetUserId: activeCall.targetUserId,
                calleePeerId: userId,
                calleeData: {
                    userId,
                    name: getUserName(user),
                    avatar: getUserAvatar(user),
                },
            })

            const pendingIncomingCall = pendingIncomingMediaCallRef.current
            if (pendingIncomingCall && getMediaCallId(pendingIncomingCall) === callToAnswer.callId) {
                await answerIncomingPeerCall(pendingIncomingCall)
            }
        } catch {
            socket.emit(SIGNALING_EVENTS.decline, {
                callId: callToAnswer.callId,
                targetUserId: callToAnswer.callerId,
            })
            resetCallState('ENDED')
        }
    }, [answerIncomingPeerCall, initializeUserMedia, resetCallState, socket, user, userId])

    const handleIncoming = useCallback(
        (data: any) => {
            const callerId = normalizeUserId(data?.callerId)
            const callId = normalizeUserId(data?.callId)
            if (!callerId || !callId) return

            if (phaseRef.current !== 'IDLE') {
                socket?.emit(SIGNALING_EVENTS.decline, {
                    callId,
                    targetUserId: callerId,
                })
                return
            }

            const callerPeerId = normalizeUserId(data?.callerPeerId || callerId)
            const normalizedType = normalizeCallType(data?.callType)
            const incomingData: IncomingCallData = {
                callId,
                callerId,
                callerPeerId,
                callerName: data?.callerData?.name || data?.callerName || 'Nguoi dung',
                callerAvatarUrl: data?.callerData?.avatar || data?.callerAvatarUrl,
                callType: normalizedType,
            }

            currentCallRef.current = {
                callId,
                targetUserId: callerId,
                targetPeerId: callerPeerId,
                direction: 'incoming',
                callType: normalizedType,
            }

            setCallType(normalizedType)
            setIncomingCall(incomingData)
            incomingCallRef.current = incomingData
            setRingingDirection('incoming')
            setCallPhase('RINGING')
            optionsRef.current?.onIncomingCall?.(incomingData)
        },
        [setCallPhase, socket]
    )

    const handleAccepted = useCallback(
        async (data: any) => {
            const activeCall = currentCallRef.current
            if (!activeCall || activeCall.direction !== 'outgoing') return
            if (!isCurrentCall(data?.callId)) return

            clearOutgoingTimeout()

            const peer = peerRef.current
            if (!peer || !peerReadyRef.current) {
                resetCallState('ENDED')
                return
            }

            try {
                const calleePeerId = normalizeUserId(data?.calleePeerId || activeCall.targetPeerId || activeCall.targetUserId)
                activeCall.targetPeerId = calleePeerId

                const stream = await initializeUserMedia(activeCall.callType === 'video')
                const mediaCall = peer.call(calleePeerId, stream, {
                    metadata: {
                        callId: activeCall.callId,
                        callType: activeCall.callType,
                        callerId: userId,
                    },
                })

                if (!mediaCall) {
                    resetCallState('ENDED')
                    return
                }

                attachMediaCall(mediaCall, activeCall.callId)
            } catch {
                resetCallState('ENDED')
            }
        },
        [attachMediaCall, clearOutgoingTimeout, initializeUserMedia, isCurrentCall, resetCallState, userId]
    )

    const handleRemoteEnd = useCallback(
        (data: any) => {
            if (!isCurrentCall(data?.callId)) return
            resetCallState('ENDED')
        },
        [isCurrentCall, resetCallState]
    )

    const rejectCall = useCallback(() => {
        const currentIncomingCall = incomingCallRef.current
        if (socket && currentIncomingCall) {
            socket.emit(SIGNALING_EVENTS.decline, {
                callId: currentIncomingCall.callId,
                targetUserId: currentIncomingCall.callerId,
            })
        }

        resetCallState('ENDED')
    }, [resetCallState, socket])

    const endCall = useCallback(() => {
        const activeCall = currentCallRef.current
        if (socket && activeCall) {
            const eventName =
                phaseRef.current === 'RINGING' && activeCall.direction === 'outgoing'
                    ? SIGNALING_EVENTS.cancel
                    : SIGNALING_EVENTS.end

            socket.emit(eventName, {
                callId: activeCall.callId,
                targetUserId: activeCall.targetUserId,
            })
        }

        resetCallState('ENDED')
    }, [resetCallState, socket])

    const toggleAudio = useCallback(() => {
        if (!localStreamRef.current) return

        const nextMuted = !isMuted
        localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = !nextMuted
        })

        setIsMuted(nextMuted)
    }, [isMuted])

    const toggleVideo = useCallback(() => {
        if (!localStreamRef.current) return

        const videoTracks = localStreamRef.current.getVideoTracks()
        if (!videoTracks.length) return

        const nextValue = !isVideoOn
        videoTracks.forEach((track) => {
            track.enabled = nextValue
        })

        setIsVideoOn(nextValue)
    }, [isVideoOn])

    useEffect(() => {
        optionsRef.current = options
    }, [options])

    useEffect(() => {
        if (!userId) {
            if (peerRef.current) {
                try {
                    peerRef.current.destroy()
                } catch {
                    return
                }
                peerRef.current = null
            }
            peerReadyRef.current = false
            setIsPeerReady(false)
            return
        }

        const peer = new Peer(userId, getPeerOptions())
        peerRef.current = peer
        peerReadyRef.current = false
        setIsPeerReady(false)

        peer.on('open', () => {
            peerReadyRef.current = true
            setIsPeerReady(true)
        })

        peer.on('call', (mediaCall) => {
            void handlePeerIncomingCall(mediaCall)
        })

        peer.on('error', () => {
            peerReadyRef.current = false
            setIsPeerReady(false)
            if (phaseRef.current !== 'IDLE') {
                resetCallState('ENDED')
            }
        })

        peer.on('disconnected', () => {
            peerReadyRef.current = false
            setIsPeerReady(false)
        })

        peer.on('close', () => {
            peerReadyRef.current = false
            setIsPeerReady(false)
        })

        return () => {
            peerReadyRef.current = false
            setIsPeerReady(false)

            if (peerRef.current === peer) {
                peerRef.current = null
            }

            try {
                peer.destroy()
            } catch {
                return
            }
        }
    }, [handlePeerIncomingCall, resetCallState, userId])

    useEffect(() => {
        if (!socket) return

        socket.on(SIGNALING_EVENTS.incoming, handleIncoming)
        socket.on(SIGNALING_EVENTS.accepted, handleAccepted)
        socket.on(SIGNALING_EVENTS.declined, handleRemoteEnd)
        socket.on(SIGNALING_EVENTS.unavailable, handleRemoteEnd)
        socket.on(SIGNALING_EVENTS.busy, handleRemoteEnd)
        socket.on(SIGNALING_EVENTS.cancelled, handleRemoteEnd)
        socket.on(SIGNALING_EVENTS.end, handleRemoteEnd)
        socket.on(SIGNALING_EVENTS.timeout, handleRemoteEnd)

        const handleSocketDisconnect = () => {
            if (phaseRef.current !== 'IDLE') {
                resetCallState('ENDED')
            }
        }

        socket.on('disconnect', handleSocketDisconnect)

        return () => {
            socket.off(SIGNALING_EVENTS.incoming, handleIncoming)
            socket.off(SIGNALING_EVENTS.accepted, handleAccepted)
            socket.off(SIGNALING_EVENTS.declined, handleRemoteEnd)
            socket.off(SIGNALING_EVENTS.unavailable, handleRemoteEnd)
            socket.off(SIGNALING_EVENTS.busy, handleRemoteEnd)
            socket.off(SIGNALING_EVENTS.cancelled, handleRemoteEnd)
            socket.off(SIGNALING_EVENTS.end, handleRemoteEnd)
            socket.off(SIGNALING_EVENTS.timeout, handleRemoteEnd)
            socket.off('disconnect', handleSocketDisconnect)
        }
    }, [handleAccepted, handleIncoming, handleRemoteEnd, resetCallState, socket])

    useEffect(() => {
        incomingCallRef.current = incomingCall
    }, [incomingCall])

    useEffect(() => {
        return () => {
            clearEndedTimer()
            clearOutgoingTimeout()
            resetCallState('IDLE')

            if (peerRef.current) {
                try {
                    peerRef.current.destroy()
                } catch {
                    return
                }
                peerRef.current = null
            }
        }
    }, [clearEndedTimer, clearOutgoingTimeout, resetCallState])

    return {
        phase,
        callType,
        ringingDirection,
        isPeerReady,
        incomingCall,
        localStream,
        remoteStream,
        isMuted,
        isVideoOn,
        initiateCall,
        answerCall,
        rejectCall,
        endCall,
        toggleAudio,
        toggleVideo,
    }
}