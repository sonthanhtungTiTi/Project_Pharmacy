import { Phone, PhoneOff } from 'lucide-react'

export interface IncomingCall {
	callId: string
	callerId: string
	callerName: string
	callerAvatarUrl?: string
	callType: 'video' | 'voice'
}

export interface IncomingCallModalProps {
	call: IncomingCall | null
	onAccept?: (call: IncomingCall) => void
	onReject?: (callId: string) => void
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ call, onAccept, onReject }) => {
	if (!call) return null

	const avatarInitial = (call.callerName || 'U').trim().charAt(0).toUpperCase()

	const handleAccept = () => {
		if (onAccept) {
			onAccept(call)
		}
	}

	const handleReject = () => {
		if (onReject) {
			onReject(call.callId)
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900/95 via-indigo-900/95 to-purple-900/95 backdrop-blur-sm">
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
				<p className="text-white/80 mb-2">
					{call.callType === 'video' ? '📹 Cuộc gọi video đến' : '📞 Cuộc gọi thoại đến'}
				</p>

				{/* Ringing animation */}
				<div className="flex gap-2 mb-8">
					<span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
					<span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
					<span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-16">
					<div className="flex flex-col items-center">
						<button
							onClick={handleReject}
							className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
						>
							<PhoneOff size={24} />
						</button>
						<span className="mt-2 text-sm text-white/80">Từ chối</span>
					</div>

					<div className="flex flex-col items-center">
						<button
							onClick={handleAccept}
							className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
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

export default IncomingCallModal
