import { useState } from 'react'
import { Phone, Video, Users, X } from 'lucide-react'

interface FloatingAdminButtonProps {
	onCallCustomer?: () => void
	onViewCustomers?: () => void
}

export default function FloatingAdminButton({
	onCallCustomer,
	onViewCustomers,
}: FloatingAdminButtonProps) {
	const [isOpen, setIsOpen] = useState(false)

	const handleClose = () => setIsOpen(false)

	return (
		<div className="fixed bottom-6 right-6 z-[80]">
			{/* Menu Items */}
			{isOpen && (
				<div className="absolute bottom-24 right-0 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 space-y-3 min-w-[220px] animate-in fade-in zoom-in-95 duration-200">
					{/* Quick Call */}
					{onCallCustomer && (
						<button
							onClick={() => {
								onCallCustomer()
								handleClose()
							}}
							className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-green-50 transition text-left"
							title="Gọi khách hàng"
						>
							<div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
								<Phone className="w-5 h-5 text-green-600" />
							</div>
							<div>
								<div className="text-sm font-medium text-gray-900">Gọi Khách</div>
								<div className="text-xs text-gray-500">Gọi nhanh</div>
							</div>
						</button>
					)}

					{/* View Customers */}
					{onViewCustomers && (
						<button
							onClick={() => {
								onViewCustomers()
								handleClose()
							}}
							className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-blue-50 transition text-left"
							title="Xem danh sách khách hàng"
						>
							<div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
								<Users className="w-5 h-5 text-blue-600" />
							</div>
							<div>
								<div className="text-sm font-medium text-gray-900">Khách Hàng</div>
								<div className="text-xs text-gray-500">Danh sách</div>
							</div>
						</button>
					)}

					{/* Video Room */}
					<button
						disabled
						className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gray-50 cursor-not-allowed text-left opacity-50"
						title="Phòng video (sắp có)"
					>
						<div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
							<Video className="w-5 h-5 text-purple-600" />
						</div>
						<div>
							<div className="text-sm font-medium text-gray-900">Phòng Video</div>
							<div className="text-xs text-gray-500">Sắp có</div>
						</div>
					</button>
				</div>
			)}

			{/* Main Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="relative w-20 h-20 rounded-full shadow-lg hover:shadow-xl transition-all overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 border-4 border-white hover:scale-110 duration-200"
				aria-label="Mở menu hỗ trợ"
			>
				{isOpen ? (
					<X className="w-8 h-8 text-white" />
				) : (
					<>
						{/* Admin Avatar - Simplified version */}
						<div className="w-16 h-16 flex flex-col items-center justify-center">
							{/* Head */}
							<div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-1 shadow-md">
								{/* Headset Icon */}
								<Phone className="w-6 h-6 text-blue-500" />
							</div>
							{/* Name badge */}
							<div className="bg-white text-blue-600 text-xs font-bold rounded-full px-2 py-0.5 whitespace-nowrap">
								Hỗ trợ
							</div>
						</div>
					</>
				)}
			</button>

			{/* Notification dot */}
			{!isOpen && (
				<div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
			)}
		</div>
	)
}
