    import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react'
import type { CallPhase, RingingDirection } from '@/hooks/useWebRTCCall'

interface VideoCallOverlayProps {
    phase: CallPhase
    ringingDirection: RingingDirection
    callType: 'video' | 'voice'
    peerName: string
    peerAvatarUrl?: string
    durationSec: number
    isMuted: boolean
    isVideoOn: boolean
    onMicToggle: () => void
    onVideoToggle: () => void
    onAnswer?: () => void
    onReject?: () => void
    onHangup: () => void
    localStream: MediaStream | null
    remoteStream: MediaStream | null
}

const PIP_WIDTH = 132
const PIP_HEIGHT = 176
const PIP_MARGIN = 12
const PIP_BOTTOM_SAFE = 116

const formatDuration = (sec: number) => {
    const minutes = Math.floor(sec / 60)
    const seconds = sec % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const getDefaultPipPosition = () => ({
    x: Math.max(PIP_MARGIN, window.innerWidth - PIP_WIDTH - 16),
    y: Math.max(PIP_MARGIN, window.innerHeight - PIP_HEIGHT - PIP_BOTTOM_SAFE),
})

const clampPipPosition = (x: number, y: number) => {
    const maxX = Math.max(PIP_MARGIN, window.innerWidth - PIP_WIDTH - PIP_MARGIN)
    const maxY = Math.max(PIP_MARGIN, window.innerHeight - PIP_HEIGHT - PIP_BOTTOM_SAFE)
    return {
        x: Math.min(Math.max(PIP_MARGIN, x), maxX),
        y: Math.min(Math.max(PIP_MARGIN, y), maxY),
    }
}

export default function VideoCallOverlay({
    phase,
    ringingDirection,
    callType,
    peerName,
    peerAvatarUrl,
    durationSec,
    isMuted,
    isVideoOn,
    onMicToggle,
    onVideoToggle,
    onAnswer,
    onReject,
    onHangup,
    localStream,
    remoteStream,
}: VideoCallOverlayProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)

    const [pipPosition, setPipPosition] = useState(() =>
        typeof window === 'undefined' ? { x: 16, y: 80 } : getDefaultPipPosition()
    )
    const dragOffsetRef = useRef({ x: 0, y: 0 })
    const draggingRef = useRef(false)

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [remoteStream])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleResize = () => {
            setPipPosition((prev) => clampPipPosition(prev.x, prev.y))
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const hasRemoteVideo = !!remoteStream && remoteStream.getVideoTracks().length > 0
    const hasLocalVideo = !!localStream && localStream.getVideoTracks().length > 0
    const isVideoCall = callType === 'video'
    const avatarInitial = useMemo(() => (peerName || 'U').trim().charAt(0).toUpperCase(), [peerName])

    const handlePipPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        dragOffsetRef.current = {
            x: event.clientX - pipPosition.x,
            y: event.clientY - pipPosition.y,
        }
        draggingRef.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    const handlePipPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!draggingRef.current) return

        const nextX = event.clientX - dragOffsetRef.current.x
        const nextY = event.clientY - dragOffsetRef.current.y
        setPipPosition(clampPipPosition(nextX, nextY))
    }

    const handlePipPointerUp = (event: PointerEvent<HTMLDivElement>) => {
        draggingRef.current = false
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
    }

    const isIncomingRinging = phase === 'RINGING' && ringingDirection === 'incoming'
    const isOutgoingRinging = phase === 'RINGING' && ringingDirection === 'outgoing'

    if (isIncomingRinging) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/95 via-gray-900/95 to-zinc-900/95 backdrop-blur-sm">
                <div className="flex flex-col items-center text-center text-white px-6">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '1.5s' }}></div>
                        <div className="relative w-28 h-28 rounded-full bg-white/10 border-4 border-white/30 flex items-center justify-center overflow-hidden">
                            {peerAvatarUrl ? (
                                <img src={peerAvatarUrl} alt={peerName} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-5xl font-bold">{avatarInitial}</span>
                            )}
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold mb-2">{peerName}</h2>
                    <p className="text-white/80 mb-2">
                        {isVideoCall ? 'Cuoc goi video den' : 'Cuoc goi thoai den'}
                    </p>

                    <div className="flex gap-2 mb-8">
                        <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>

                    <div className="flex items-center gap-16">
                        <div className="flex flex-col items-center">
                            <button
                                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
                                onClick={onReject}
                                aria-label="Tu choi"
                            >
                                <PhoneOff size={24} />
                            </button>
                            <span className="mt-2 text-sm text-white/80">Tu choi</span>
                        </div>

                        <div className="flex flex-col items-center">
                            <button
                                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
                                onClick={onAnswer}
                                aria-label="Tra loi"
                            >
                                <Phone size={24} />
                            </button>
                            <span className="mt-2 text-sm text-white/80">Tra loi</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (isOutgoingRinging) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/95 via-gray-900/95 to-zinc-900/95 backdrop-blur-sm text-white">
                {isVideoCall && hasLocalVideo && (
                    <div className="absolute inset-0 opacity-20">
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    </div>
                )}

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full bg-white/10 border-4 border-white/30 flex items-center justify-center overflow-hidden mb-6">
                        {peerAvatarUrl ? (
                            <img src={peerAvatarUrl} alt={peerName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-5xl font-bold">{avatarInitial}</span>
                        )}
                    </div>

                    <h2 className="text-3xl font-bold mb-2">{peerName}</h2>
                    <p className="text-white/80 mb-1">Dang goi...</p>
                    <p className="text-white/60 text-sm mb-6">Dang cho nguoi nhan bat may</p>

                    <div className="flex gap-2 mb-8">
                        <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                        <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                    </div>

                    <button
                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
                        onClick={onHangup}
                        aria-label="Huy cuoc goi"
                    >
                        <PhoneOff size={24} />
                    </button>
                    <span className="mt-2 text-sm text-white/80">Huy cuoc goi</span>
                </div>
            </div>
        )
    }

    if (phase !== 'IN_CALL') {
        return null
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
            <div className="flex-1 relative">
                {isVideoCall && hasRemoteVideo ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 text-white">
                        <div className="w-32 h-32 rounded-full bg-white/10 border-4 border-white/30 flex items-center justify-center overflow-hidden mb-4">
                            {peerAvatarUrl ? (
                                <img src={peerAvatarUrl} alt={peerName} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-6xl font-bold">{avatarInitial}</span>
                            )}
                        </div>
                        <p className="text-2xl font-bold">{peerName}</p>
                        {!isVideoCall && <span className="text-emerald-400 mt-2">{formatDuration(durationSec)}</span>}
                    </div>
                )}

                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
                    <div className="flex items-center justify-between text-white">
                        <div>
                            <h3 className="font-semibold text-lg">{peerName}</h3>
                            <span className="text-sm text-emerald-400">{formatDuration(durationSec)}</span>
                        </div>
                    </div>
                </div>

                {isVideoCall && hasLocalVideo && (
                    <div
                        className="absolute rounded-xl overflow-hidden border-2 border-white/35 shadow-xl bg-gray-800 touch-none cursor-move select-none"
                        style={{
                            width: `${PIP_WIDTH}px`,
                            height: `${PIP_HEIGHT}px`,
                            left: `${pipPosition.x}px`,
                            top: `${pipPosition.y}px`,
                        }}
                        onPointerDown={handlePipPointerDown}
                        onPointerMove={handlePipPointerMove}
                        onPointerUp={handlePipPointerUp}
                        onPointerCancel={handlePipPointerUp}
                        aria-label="Local preview"
                    >
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    </div>
                )}
            </div>

            <div className="bg-gray-800/90 backdrop-blur-sm px-6 py-4 flex items-center justify-center gap-4">
                <button
                    className={`p-4 rounded-full transition-all ${isMuted ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
                    onClick={onMicToggle}
                    title={isMuted ? 'Bat micro' : 'Tat micro'}
                >
                    {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>

                {isVideoCall && (
                    <button
                        className={`p-4 rounded-full transition-all ${!isVideoOn ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
                        onClick={onVideoToggle}
                        title={isVideoOn ? 'Tat camera' : 'Bat camera'}
                    >
                        {isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
                    </button>
                )}

                <button
                    className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all hover:scale-110"
                    onClick={onHangup}
                    title="Ket thuc cuoc goi"
                >
                    <PhoneOff size={22} />
                </button>
            </div>
        </div>
    )
}