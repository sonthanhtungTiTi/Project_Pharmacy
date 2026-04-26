import { useEffect, useMemo, useState } from 'react'
import PharmacyLayout from '../components/layout/layout'
import { useCart } from '../hooks/useCart'

interface CartPageProps {
	onBackHome?: () => void
}

const formatVnd = (value: number) => {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return '0đ'
	}
	return `${new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value)))}đ`
}

const CHECKOUT_SELECTED_IDS_KEY = 'checkout:selectedProductIds'

function CartPage({ onBackHome }: CartPageProps) {
	const { cart, error, isLoading, updateItem, removeItem, clearAllItems } = useCart()
	const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

	const items = useMemo(() => (cart?.items || []).filter(item => item && item.productId), [cart?.items])
	const invalidQuantityItems = useMemo(() => items.filter((item) => item.quantity <= 0), [items])
	const invalidPriceItems = useMemo(() => items.filter((item) => item.unitPrice <= 0), [items])
	const hasInvalidItems = invalidQuantityItems.length > 0 || invalidPriceItems.length > 0

	useEffect(() => {
		setSelectedProductIds((currentIds) => {
			const cartProductIdSet = new Set(items.map((item) => item.productId))
			const keptIds = currentIds.filter((id) => cartProductIdSet.has(id))

			if (keptIds.length > 0) {
				return keptIds
			}

			return items.map((item) => item.productId)
		})
	}, [items])

	const selectedItems = useMemo(
		() => items.filter((item) => selectedProductIds.includes(item.productId)),
		[items, selectedProductIds],
	)

	const selectedTotalQuantity = useMemo(
		() => selectedItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
		[selectedItems],
	)

	const selectedTotalAmount = useMemo(
		() => selectedItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0),
		[selectedItems],
	)

	const hasSelectedItems = selectedItems.length > 0
	const canCheckout = hasSelectedItems && selectedTotalAmount > 0 && !hasInvalidItems
	const allSelected = items.length > 0 && selectedProductIds.length === items.length

	const checkoutReason = (() => {
		if (items.length === 0) {
			return 'Giỏ hàng đang trống'
		}

		if (!hasSelectedItems) {
			return 'Vui lòng chọn ít nhất 1 sản phẩm để thanh toán'
		}

		if (invalidQuantityItems.length > 0) {
			return 'Có sản phẩm có số lượng không hợp lệ'
		}

		if (invalidPriceItems.length > 0) {
			return 'Có sản phẩm chưa có giá hợp lệ'
		}

		if (selectedTotalAmount <= 0) {
			return 'Tổng tiền thanh toán không hợp lệ'
		}

		return ''
	})()

	const handleDecrease = async (productId: string, quantity: number) => {
		await updateItem(productId, quantity - 1)
	}

	const handleIncrease = async (productId: string, quantity: number) => {
		await updateItem(productId, quantity + 1)
	}

	const goHome = () => {
		if (onBackHome) {
			onBackHome()
			return
		}

		window.history.pushState({}, '', '/')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	const handleToggleItem = (productId: string) => {
		setSelectedProductIds((currentIds) =>
			currentIds.includes(productId) ? currentIds.filter((id) => id !== productId) : [...currentIds, productId],
		)
	}

	const handleToggleSelectAll = () => {
		if (allSelected) {
			setSelectedProductIds([])
			return
		}

		setSelectedProductIds(items.map((item) => item.productId))
	}

	const handleCheckout = () => {
		if (!canCheckout) {
			return
		}

		sessionStorage.setItem(CHECKOUT_SELECTED_IDS_KEY, JSON.stringify(selectedProductIds))
		window.history.pushState({}, '', '/thanh-toan')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	return (
		<PharmacyLayout categories={[]} hideSidebar>
			<section className="rounded-2xl bg-white p-4 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h1 className="text-2xl font-black text-slate-800">Giỏ thuốc của bạn</h1>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={goHome}
							className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
						>
							Tiếp tục mua hàng
						</button>
						<button
							type="button"
							onClick={() => void clearAllItems()}
							className="rounded-lg bg-[#fee2e2] px-3 py-2 text-sm font-semibold text-[#b91c1c]"
						>
							Xóa tất cả
						</button>
					</div>
				</div>

				{items.length > 0 && (
					<label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
						<input type="checkbox" checked={allSelected} onChange={handleToggleSelectAll} />
						<span>Chọn tất cả sản phẩm</span>
					</label>
				)}
			</section>

			{isLoading && (
				<section className="rounded-2xl bg-white p-4 shadow-sm">
					<p className="text-sm text-slate-600">Đang tải giỏ hàng...</p>
				</section>
			)}

			{!isLoading && error && (
				<section className="rounded-2xl bg-white p-4 shadow-sm">
					<p className="text-sm font-medium text-red-500">{error}</p>
				</section>
			)}

			{!isLoading && !error && items.length === 0 && (
				<section className="rounded-2xl bg-white p-4 shadow-sm">
					<p className="text-sm text-slate-600">Giỏ hàng của bạn đang trống.</p>
				</section>
			)}

			{!isLoading && !error && items.length > 0 && (
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
					<section className="rounded-2xl bg-white p-4 shadow-sm">
						<div className="space-y-3">
							{items.map((item) => {
								const itemValid = (item.quantity || 0) > 0 && (item.unitPrice || 0) > 0
								const isSelected = selectedProductIds.includes(item.productId)

								return (
									<article
										key={item.productId}
										className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[110px_1fr_auto]"
									>
										<div className="md:col-span-3">
											<label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => handleToggleItem(item.productId)}
												/>
												<span>Chọn sản phẩm này để thanh toán</span>
											</label>
										</div>

										<div className="overflow-hidden rounded-lg bg-slate-100">
											<img
												src={item.productImage || 'https://via.placeholder.com/200x200?text=SP'}
												alt={item.productName}
												className="h-[110px] w-full object-cover"
											/>
										</div>

										<div>
											<p className="text-sm text-slate-500">Mã thuốc: {item.medicineCode || '-'}</p>
											<h2 className="mt-1 text-base font-bold text-slate-800">{item.productName}</h2>
											<p className="mt-2 text-sm font-semibold text-[#ef4444]">{formatVnd(item.unitPrice)}</p>
											<p className={`mt-1 text-xs font-medium ${itemValid ? 'text-[#16a34a]' : 'text-[#ef4444]'}`}>
												{itemValid ? 'Trạng thái: Sẵn sàng thanh toán' : 'Trạng thái: Cần cập nhật sản phẩm'}
											</p>
										</div>

										<div className="flex flex-col items-end justify-between gap-2">
											<div className="flex items-center rounded-lg border border-slate-300">
												<button
													type="button"
													onClick={() => void handleDecrease(item.productId, item.quantity)}
													className="px-3 py-1.5 text-sm font-bold text-slate-700"
												>
													-
												</button>
												<span className="px-3 py-1.5 text-sm font-semibold text-slate-700">{item.quantity}</span>
												<button
													type="button"
													onClick={() => void handleIncrease(item.productId, item.quantity)}
													className="px-3 py-1.5 text-sm font-bold text-slate-700"
												>
													+
												</button>
											</div>

											<p className="text-sm font-semibold text-slate-800">{formatVnd(item.lineTotal)}</p>

											<button
												type="button"
												onClick={() => void removeItem(item.productId)}
												className="text-sm font-semibold text-red-500"
											>
												Xóa
											</button>
										</div>
									</article>
								)
							})}
						</div>
					</section>

					<aside className="rounded-2xl bg-white p-4 shadow-sm">
						<h3 className="text-[30px] font-bold text-slate-800">Tạm tính</h3>
						<div className="mt-4 space-y-3 border-b border-slate-200 pb-4 text-sm">
							<div className="flex items-center justify-between text-slate-600">
								<span>Số sản phẩm đã chọn</span>
								<span className="font-semibold text-slate-800">{selectedItems.length}</span>
							</div>
							<div className="flex items-center justify-between text-slate-600">
								<span>Tổng số lượng</span>
								<span className="font-semibold text-slate-800">{selectedTotalQuantity}</span>
							</div>
							<div className="flex items-center justify-between text-slate-600">
								<span>Tổng tiền hàng</span>
								<span className="font-semibold text-slate-800">{formatVnd(selectedTotalAmount)}</span>
							</div>
						</div>

						<div className="mt-4 flex items-center justify-between text-base font-bold text-slate-900">
							<span>Tạm tính thanh toán</span>
							<span className="text-[#ef4444]">{formatVnd(selectedTotalAmount)}</span>
						</div>

						<button
							type="button"
							onClick={handleCheckout}
							disabled={!canCheckout}
							className="mt-4 h-12 w-full rounded-xl bg-[#35b548] text-lg font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[#9ca3af] disabled:hover:brightness-100"
						>
							Thanh toán
						</button>

						{!canCheckout && (
							<p className="mt-3 text-sm font-medium text-[#ef4444]">{checkoutReason}</p>
						)}
					</aside>
				</div>
			)}
		</PharmacyLayout>
	)
}

export default CartPage
