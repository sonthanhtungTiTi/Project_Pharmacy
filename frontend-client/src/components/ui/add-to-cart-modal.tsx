import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'

interface AddToCartModalProps {
	isOpen: boolean
	productName: string
	priceLabel: string
	originalPriceLabel?: string
	saleLabel?: string
	onClose: () => void
	onConfirm: (quantity: number) => Promise<void> | void
	onLoginRequired?: () => void
}

function AddToCartModal({
	isOpen,
	productName,
	priceLabel,
	originalPriceLabel,
	saleLabel,
	onClose,
	onConfirm,
	onLoginRequired,
}: AddToCartModalProps) {
	const [quantity, setQuantity] = useState(1)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState('')

	useEffect(() => {
		if (!isOpen) {
			return
		}

		setQuantity(1)
		setError('')

		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose()
			}
		}

		window.addEventListener('keydown', handleKeyDown)

		return () => {
			document.body.style.overflow = previousOverflow
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen, onClose])

	if (!isOpen) {
		return null
	}

	const updateQuantity = (nextValue: number) => {
		const safeValue = Number.isFinite(nextValue) ? Math.max(1, Math.floor(nextValue)) : 1
		setQuantity(safeValue)
	}

	const handleConfirm = async () => {
		try {
			setIsSubmitting(true)
			setError('')
			await onConfirm(quantity)
			toast.success('Đã thêm vào giỏ hàng')
			onClose()
		} catch (apiError) {
			const errorMessage = apiError instanceof Error ? apiError.message : 'Không thể thêm vào giỏ hàng'
			
			// Check if it's a login error
			if (errorMessage.includes('đăng nhập') || errorMessage.includes('Vui lòng')) {
				toast.error(errorMessage)
				onLoginRequired?.()
				onClose()
			} else {
				setError(errorMessage)
			}
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/45 p-3 sm:items-center">
			<div className="relative w-full max-w-[640px] overflow-hidden rounded-[10px] bg-white shadow-[0_3px_6px_-4px_#0000001f,_0_6px_16px_#00000014,_0_9px_28px_8px_#0000000d]">
				<button
					type="button"
					onClick={onClose}
					className="absolute right-3 top-3 z-[1001] flex h-[22px] w-[22px] items-center justify-center bg-white text-base font-bold text-black"
				>
					✕
				</button>

				<div className="overflow-hidden border-b border-b-[#e0e0e0] px-5 py-4 pr-[60px] text-lg font-bold">
					<p className="line-clamp-2">{productName}</p>
				</div>

				<div className="p-5">
					<div className="border-b border-b-[#e0e0e0] pb-5">
						<p className="mb-5 text-sm font-semibold">Số lượng</p>
						<div className="flex w-[180px] justify-between overflow-hidden rounded-xl border border-[#7ECA82]">
							<button
								type="button"
								onClick={() => updateQuantity(quantity - 1)}
								disabled={quantity <= 1}
								className="flex h-[44px] min-w-[44px] items-center justify-center bg-[#F2FAF2] text-base text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								-
							</button>
							<div className="flex flex-1 items-center justify-center text-base text-slate-900">
								<input
									id="quantity"
									type="number"
									min={1}
									value={quantity}
									onChange={(event) => updateQuantity(Number(event.target.value))}
									className="w-full appearance-none text-center outline-none [moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								/>
							</div>
							<button
								type="button"
								onClick={() => updateQuantity(quantity + 1)}
								className="flex h-[44px] min-w-[44px] items-center justify-center bg-[#F2FAF2] text-base text-slate-700"
							>
								+
							</button>
						</div>
					</div>

					{error && <p className="mt-3 text-sm text-red-500">{error}</p>}

					<div className="mt-5">
						<div className="flex items-end justify-between gap-4">
							<div className="leading-5">
								<p className="text-[36px] font-bold text-red-500">{priceLabel}</p>
								<div className="mt-1 flex items-center gap-1">
									{originalPriceLabel ? <del className="text-[33px] text-slate-500">{originalPriceLabel}</del> : null}
									{saleLabel ? (
										<span className="rounded-xl bg-[#f14153] px-1.5 py-[1px] text-[12px] font-bold text-white">{saleLabel}</span>
									) : null}
								</div>
							</div>
							<button
								type="button"
								onClick={() => void handleConfirm()}
								disabled={isSubmitting}
								className="h-[44px] w-full max-w-[290px] rounded-xl bg-[#39B54A] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
							>
									{isSubmitting ? 'Đang xử lý...' : 'Thêm vào giỏ'}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default AddToCartModal
