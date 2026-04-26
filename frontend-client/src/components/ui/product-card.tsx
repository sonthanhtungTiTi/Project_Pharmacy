import { useState } from 'react'
import { notifyCartUpdated } from '../../hooks/useCart'
import { addToCart } from '../../services/cart.service'
import AddToCartModal from './add-to-cart-modal'

interface ProductCardProps {
	productCode?: string
	productId?: string
	name: string
	imageUrl?: string
	price: string
	originalPrice?: string
	sale?: string
	soldCount?: number
	totalCount?: number
	onViewDetail?: (productId: string) => void
}

function ProductCard({
	productCode,
	productId,
	name,
	imageUrl,
	price,
	originalPrice,
	sale,
	soldCount = 17,
	totalCount = 20,
	onViewDetail,
}: ProductCardProps) {
	const [isAddModalOpen, setIsAddModalOpen] = useState(false)
	const [addResultMessage, setAddResultMessage] = useState('')
	const safeTotal = totalCount > 0 ? totalCount : 20
	const safeSold = Math.min(Math.max(soldCount, 0), safeTotal)
	const progressPercent = Math.round((safeSold / safeTotal) * 100)

	const handleViewDetail = () => {
		if (productId && onViewDetail) {
			onViewDetail(productId)
		}
	}

	const handleOpenAddModal = () => {
		if (!productId) {
			setAddResultMessage('Sản phẩm này chưa sẵn sàng để thêm vào giỏ')
			return
		}

		setAddResultMessage('')
		setIsAddModalOpen(true)
	}

	const handleConfirmAddToCart = async (quantity: number) => {
		if (!productId) {
			throw new Error('Sản phẩm không hợp lệ')
		}

		await addToCart(productId, quantity)
		notifyCartUpdated()
		setAddResultMessage('Đã thêm vào giỏ thuốc')
	}

	const handleLoginRequired = () => {
		// Trigger auth modal opening through event
		window.dispatchEvent(new CustomEvent('requestAuth'))
	}

	return (
		<article
			data-product-code={productCode || ''}
			className="flex h-full flex-col overflow-hidden rounded-xl border border-[#d9f0dc] bg-white"
		>
			<div className="flex h-full flex-col gap-2 p-3">
				<button
					type="button"
					onClick={handleViewDetail}
					className="flex min-h-[130px] items-center justify-center rounded-lg bg-white"
				>
					{imageUrl ? (
						<img
							src={imageUrl}
							alt={name}
							loading="lazy"
							className="h-[122px] w-full object-contain"
						/>
					) : (
						<div className="h-[122px] w-full rounded-lg bg-[linear-gradient(145deg,#f0f6e7,#f8f2d9)]" />
					)}
				</button>

				<div className="flex min-h-0 flex-1 flex-col gap-2">
					<button type="button" onClick={handleViewDetail} className="text-left">
						<h4 className="min-h-[60px] text-[16px] font-bold leading-5 text-slate-800 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden hover:text-[#169d33]">
							{name}
						</h4>
					</button>

					<div className="text-[29px] font-extrabold leading-none text-[#f9414c]">{price}</div>

					<div className="flex items-center gap-1 text-sm">
						{originalPrice ? <del className="text-slate-500">{originalPrice}</del> : null}
						{sale ? (
							<span className="rounded-xl bg-[#f14153] px-1.5 py-[1px] text-[12px] font-bold text-white">
								{sale}
							</span>
						) : null}
					</div>

					<div className="relative flex h-6 items-center overflow-hidden rounded-[999px] bg-[#fffbe6] px-2 text-xs text-slate-800">
						<div
							className="absolute left-0 top-0 h-full rounded-l-[999px] bg-gradient-to-r from-[#fffbcd] to-[#feb916]"
							style={{ width: `${progressPercent}%` }}
						/>
						<span className="relative z-10 font-semibold">🔥 {safeSold}/{safeTotal} Suất</span>
					</div>
				</div>
			</div>

			<div className="p-3 pt-0">
				<button
					type="button"
					onClick={handleOpenAddModal}
					className="h-10 w-full rounded-xl bg-[#35b548] text-sm font-semibold text-white transition hover:brightness-95"
				>
					Thêm vào giỏ
				</button>
				{addResultMessage && <p className="mt-2 text-xs text-slate-600">{addResultMessage}</p>}
			</div>

			<AddToCartModal
				isOpen={isAddModalOpen}
				productName={name}
				priceLabel={price}
				originalPriceLabel={originalPrice}
				saleLabel={sale}
				onClose={() => setIsAddModalOpen(false)}
				onConfirm={handleConfirmAddToCart}
				onLoginRequired={handleLoginRequired}
			/>
		</article>
	)
}

export default ProductCard
