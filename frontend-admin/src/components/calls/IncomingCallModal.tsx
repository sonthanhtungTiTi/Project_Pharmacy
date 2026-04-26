import { Phone, PhoneOff, Video } from 'lucide-react'
import type { IncomingCallData } from '@/hooks/useWebRTCCall'

interface IncomingCallModalProps {
	call: IncomingCallData | null
	onAccept: () => void
	onReject: () => void
}

export default function IncomingCallModal({ call, onAccept, onReject }: IncomingCallModalProps) {
	if (!call) return null

	const avatarInitial = (call.callerName || 'U').trim().charAt(0).toUpperCase()

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-blue-900/95 via-indigo-900/95 to-purple-900/95 backdrop-blur-sm">
			<div className="flex flex-col items-center text-center text-white px-6">
				{/* Avatar with pulse */}
				<div className="relative mb-6">
					<div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '1.5s' }}></div>
					<div className="relative w-28 h-28 rounded-full bg-white/10 border-4 border-white/30 flex items-center justify-center overflow-hidden">
						{call.callerAvatarUrl ? (
							<img src={call.callerAvatarUrl} alt={call.callerName} className="w-full h-full object-cover" />
						) : (
							<span className="text-5xl font-bold">{avatarInitial}</span>
						)}
					</div>
				</div>

				<h2 className="text-3xl font-bold mb-2">{call.callerName}</h2>
				<p className="text-white/80 mb-2 inline-flex items-center gap-2">
					{call.callType === 'video' ? <Video size={16} /> : <Phone size={16} />}
					{call.callType === 'video' ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến'}
				</p>

				{/* Ringing dots */}
				<div className="flex gap-2 mb-8">
					<span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
					<span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
					<span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-16">
					<div className="flex flex-col items-center">
						<button
							className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
							onClick={onReject}
						>
							<PhoneOff size={24} />
						</button>
						<span className="mt-2 text-sm text-white/80">Từ chối</span>
					</div>
					<div className="flex flex-col items-center">
						<button
							className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
							onClick={onAccept}
						>
							<Phone size={24} />
						</button>
						<span className="mt-2 text-sm text-white/80">Trả lời</span>
					</div>
				</div>
			</div>
		</div>
	)
}
