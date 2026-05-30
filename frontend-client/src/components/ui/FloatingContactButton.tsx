interface FloatingContactButtonProps {
	onVideoCall?: () => void
	onVoiceCall?: () => void
	onZaloChat?: () => void
	onAiChat?: () => void
}

export default function FloatingContactButton({
	onZaloChat,
	onAiChat,
}: FloatingContactButtonProps) {
	return (
		<div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4">
			{onAiChat && (
				<div className="flex flex-col items-center gap-1">
					<span className="text-xs font-semibold text-blue-700">Tư Vấn</span>
					<button
						onClick={onAiChat}
						className="relative w-20 h-20 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center bg-white border-4 border-blue-500 hover:scale-110 duration-200"
						aria-label="Trò chuyện với AI hỗ trợ"
						title="Trò chuyện với AI hỗ trợ"
					>
						<span
							className="pointer-events-none absolute -inset-1 rounded-full border-2 border-blue-400/70 animate-ping"
							aria-hidden="true"
						/>
						<img
							src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZw-qG89Qw2mhAR8CE8gvpY7OcUp_dejBJYBc8CyZvsg&s"
							alt="Chat AI"
							className="w-14 h-14 object-contain"
						/>
					</button>
				</div>
			)}

			{onZaloChat && (
				<div className="flex flex-col items-center gap-1">
					{/* <span className="text-xs font-semibold text-indigo-700">Tư Vấn</span> */}
					<button
						onClick={onZaloChat}
						className="relative w-20 h-20 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center bg-white border-4 border-indigo-500 hover:scale-110 duration-200"
						aria-label="Chat qua Zalo"
						title="Chat qua Zalo"
					>
						<span
							className="pointer-events-none absolute -inset-1 rounded-full border-2 border-indigo-400/70 animate-ping"
							aria-hidden="true"
						/>
						<img
							src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg"
							alt="Chat Zalo"
							className="w-14 h-14 object-contain"
						/>
					</button>
				</div>
			)}
		</div>
	)
}
