import { useState } from 'react'
import { Phone, MessageSquare, X } from 'lucide-react'

interface FloatingContactButtonProps {
	onVideoCall?: () => void
	onVoiceCall?: () => void
	onZaloChat?: () => void
	onAiChat?: () => void
}

export default function FloatingContactButton({
	onVideoCall,
	onVoiceCall,
	onZaloChat,
	onAiChat,
}: FloatingContactButtonProps) {
	const [isOpen, setIsOpen] = useState(false)

	const handleClose = () => setIsOpen(false)

	return (
		<div className="fixed bottom-6 right-6 z-40">
			{/* Menu Items */}
			{isOpen && (
				<div className="absolute bottom-24 right-0 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 space-y-3 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
					{/* AI Chat */}
					{onAiChat && (
						<button
							onClick={() => {
								onAiChat()
								handleClose()
							}}
							className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-cyan-50 transition text-left"
							title="Trò chuyện với AI hỗ trợ"
						>
							<div className="flex-shrink-0 w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
								<MessageSquare className="w-5 h-5 text-cyan-600" />
							</div>
							<span className="text-sm font-medium text-gray-900">Chat AI</span>
						</button>
					)}

					{/* Gọi Tư Vấn (opens call selector) */}
					{(onVideoCall || onVoiceCall) && (
						<button
							onClick={() => {
								if (onVideoCall) onVideoCall()
								else if (onVoiceCall) onVoiceCall()
								handleClose()
							}}
							className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-green-50 transition text-left"
							title="Gọi tư vấn với dược sĩ"
						>
							<div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
								<Phone className="w-5 h-5 text-green-600" />
							</div>
							<span className="text-sm font-medium text-gray-900">Gọi Tư Vấn</span>
						</button>
					)}

					{/* Zalo Chat */}
					{onZaloChat && (
						<button
							onClick={() => {
								onZaloChat()
								handleClose()
							}}
							className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-indigo-50 transition text-left"
							title="Chat qua Zalo"
						>
							<div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
								<MessageSquare className="w-5 h-5 text-indigo-600" />
							</div>
							<span className="text-sm font-medium text-gray-900">Chat Zalo</span>
						</button>
					)}
				</div>
			)}

			{/* Main Button - Mascot Avatar */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="relative w-20 h-20 rounded-full shadow-lg hover:shadow-xl transition-all overflow-hidden flex items-center justify-center bg-white border-4 border-blue-500 hover:scale-110 duration-200"
				aria-label="Mở menu liên hệ"
			>
				{isOpen ? (
					<X className="w-8 h-8 text-gray-600" />
				) : (
					<>
						{/* Mascot Avatar - Simplified version */}
						<div className="w-16 h-16 flex flex-col items-center justify-center">
							{/* Head */}
							<div className="w-12 h-12 rounded-full bg-gradient-to-b from-blue-400 to-blue-500 flex items-center justify-center mb-1 shadow-md">
								{/* Face */}
								<div className="flex gap-2">
									<div className="w-2 h-2 bg-white rounded-full"></div>
									<div className="w-2 h-2 bg-white rounded-full"></div>
								</div>
							</div>
							{/* Name badge */}
							<div className="bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-0.5 whitespace-nowrap">
								Tư vấn
							</div>
						</div>
					</>
				)}
			</button>

			{/* Notification dot if menu is available */}
			{!isOpen && (
				<div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
			)}
		</div>
	)
}
