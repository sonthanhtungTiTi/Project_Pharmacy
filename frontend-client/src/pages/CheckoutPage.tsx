import { useEffect, useMemo, useState } from 'react'
import PharmacyLayout from '../components/layout/layout'
import { useAddress } from '../hooks/useAddress'
import { useCart } from '../hooks/useCart'
import { checkoutFromCart } from '../services/order.service'
import { MomoPaymentError, createMomoPayment } from '../services/momo.service'
import type { PaymentMethod } from '../services/order.service'
import { VnpayPaymentError, createVnpayPayment } from '../services/vnpay.service'

interface CheckoutPageProps {
	onBackToCart?: () => void
	onBackHome?: () => void
}

const CHECKOUT_SELECTED_IDS_KEY = 'checkout:selectedProductIds'



const paymentMethodOptions: Array<{ value: PaymentMethod; label: string; description: string }> = [
	{
		value: 'cod',
		label: 'Thanh toán khi nhận hàng (COD)',
		description: 'Thanh toán trực tiếp cho nhân viên giao hàng.',
	},
	{
		value: 'bank_transfer',
		label: 'Thanh toán VNPay',
		description: 'Thanh toán trực tuyến qua cổng VNPay (ATM, QR, thẻ nội địa).',
	},
	{
		value: 'momo',
		label: 'Momo',
		description: 'Thanh toán qua ứng dụng Momo - nhanh, an toàn. *Đơn tự hủy nếu không thanh toán.',
	},
]

const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value)))}đ`

const goPath = (path: string) => {
	window.history.pushState({}, '', path)
	window.dispatchEvent(new PopStateEvent('popstate'))
}

function CheckoutPage({ onBackToCart, onBackHome }: CheckoutPageProps) {
	const { cart, isLoading: isLoadingCart, refreshCart } = useCart()
	const { addresses, defaultAddress, isLoading: isLoadingAddress } = useAddress()
	const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
	const [selectedAddressId, setSelectedAddressId] = useState('')
	const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false)
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
	const [note, setNote] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitError, setSubmitError] = useState('')
	const [submitSuccess, setSubmitSuccess] = useState('')
	const [prescriptionImage, setPrescriptionImage] = useState('')
	const [isUploadingRx, setIsUploadingRx] = useState(false)

	useEffect(() => {
		if (!selectedAddressId && defaultAddress?.id) {
			setSelectedAddressId(defaultAddress.id)
		}
	}, [defaultAddress?.id, selectedAddressId])

	useEffect(() => {
		if (!selectedAddressId) {
			return
		}

		const addressExists = addresses.some((item) => item.id === selectedAddressId)
		if (!addressExists) {
			setSelectedAddressId(defaultAddress?.id || '')
		}
	}, [addresses, defaultAddress?.id, selectedAddressId])

	useEffect(() => {
		const raw = sessionStorage.getItem(CHECKOUT_SELECTED_IDS_KEY)
		if (!raw) {
			setSelectedProductIds([])
			return
		}

		try {
			const parsed = JSON.parse(raw) as string[]
			const normalized = Array.isArray(parsed)
				? Array.from(new Set(parsed.map((id) => String(id || '').trim()).filter(Boolean)))
				: []
			setSelectedProductIds(normalized)
		} catch {
			setSelectedProductIds([])
		}
	}, [])

	const selectedItems = useMemo(
		() => cart.items.filter((item) => selectedProductIds.includes(item.productId)),
		[cart.items, selectedProductIds],
	)

	const totalQuantity = useMemo(
		() => selectedItems.reduce((sum, item) => sum + item.quantity, 0),
		[selectedItems],
	)

	const totalAmount = useMemo(
		() => selectedItems.reduce((sum, item) => sum + item.lineTotal, 0),
		[selectedItems],
	)
	const selectedCheckoutAddress =
		addresses.find((item) => item.id === selectedAddressId) ||
		defaultAddress ||
		null

	const hasRxItems = selectedItems.some((item) => item.requiresPrescription)
	const isSelectionValid = selectedItems.length > 0 && totalAmount > 0 && (!hasRxItems || Boolean(prescriptionImage))

	const canSubmit = Boolean(selectedCheckoutAddress?.id) && isSelectionValid && !isSubmitting && !isUploadingRx
	const submitButtonLabel = isSubmitting
		? 'Đang xử lý...'
		: paymentMethod === 'bank_transfer'
			? 'Thanh toán qua VNPay'
			: paymentMethod === 'momo'
				? 'Thanh toán bằng QR MoMo'
				: 'Xác nhận đặt hàng'

	const handleBackToCart = () => {
		if (onBackToCart) {
			onBackToCart()
			return
		}

		goPath('/gio-hang')
	}

	const handleBackHome = () => {
		if (onBackHome) {
			onBackHome()
			return
		}

		goPath('/')
	}

	const handlePlaceOrder = async () => {
		if (!selectedCheckoutAddress?.id || !canSubmit) {
			return
		}

		if (hasRxItems && !prescriptionImage) {
			setSubmitError('Vui lòng tải lên hình ảnh đơn thuốc hợp lệ.')
			return
		}

		try {
			setIsSubmitting(true)
			setSubmitError('')
			setSubmitSuccess('')

			const order = await checkoutFromCart({
				addressId: selectedCheckoutAddress.id,
				paymentMethod,
				note,
				selectedProductIds,
				prescriptionImage,
			})

			sessionStorage.removeItem(CHECKOUT_SELECTED_IDS_KEY)
			await refreshCart()

			// Nếu chọn Momo, redirect đến trang thanh toán Momo
			if (paymentMethod === 'momo') {
				try {
					// Lưu orderId để Momo result page sử dụng
					sessionStorage.setItem('momoOrderId', order.id)

					const momoResponse = await createMomoPayment(
						order.id,
						order.totalAmount,
						`Thanh toán đơn hàng #${order.orderCode}`
					)

					if (momoResponse.success && momoResponse.payUrl) {
						// Redirect to Momo
						window.location.href = momoResponse.payUrl
						return
					}

					throw new Error('Khong nhan duoc link thanh toan Momo')
				} catch (momoError) {
					console.error('Momo redirect error:', momoError)
					const momoMessage =
						momoError instanceof MomoPaymentError && momoError.resultCode === 98
							? 'MoMo dang ban tao QR, vui long thử lại sau vai giay'
							: momoError instanceof Error
								? momoError.message
								: 'Khong tao duoc lien ket thanh toan Momo'

					const normalizedMomoMessage = momoMessage.trim().replace(/[.\s]+$/g, '')
					setSubmitError(
						`${normalizedMomoMessage}. Đơn hàng ${order.orderCode} đã được tạo, vui lòng thử lại thanh toán Momo.`
					)
					return
				}
			}

			if (paymentMethod === 'bank_transfer') {
				try {
					sessionStorage.setItem('vnpayOrderId', order.id)

					const vnpayResponse = await createVnpayPayment({
						orderId: order.id,
					})

					if (vnpayResponse.success && vnpayResponse.payUrl) {
						window.location.href = vnpayResponse.payUrl
						return
					}

					throw new Error('Khong nhan duoc link thanh toan VNPAY')
				} catch (vnpayError) {
					console.error('VNPay redirect error:', vnpayError)
					const vnpayMessage =
						vnpayError instanceof VnpayPaymentError
							? vnpayError.message
							: vnpayError instanceof Error
								? vnpayError.message
								: 'Khong tao duoc lien ket thanh toan VNPAY'

					const normalizedVnpayMessage = vnpayMessage.trim().replace(/[.\s]+$/g, '')
					setSubmitError(
						`${normalizedVnpayMessage}. Đơn hàng ${order.orderCode} đã được tao, vui long thử lại thanh toan VNPAY.`
					)
					return
				}
			}

			setSubmitSuccess(`Đặt hàng thành công. Mã đơn hàng: ${order.orderCode}`)
		} catch (apiError) {
			setSubmitError(apiError instanceof Error ? apiError.message : 'Không thể thanh toan')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		setIsUploadingRx(true)
		const reader = new FileReader()
		reader.onloadend = () => {
			setPrescriptionImage(reader.result as string)
			setIsUploadingRx(false)
		}
		reader.readAsDataURL(file)
	}

	return (
		<PharmacyLayout categories={[]} hideSidebar>
			<section className="rounded-2xl bg-white p-4 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h1 className="text-2xl font-black text-slate-800">Thanh toán</h1>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleBackToCart}
							className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
						>
							Quay lại giỏ hàng
						</button>
						<button
							type="button"
							onClick={handleBackHome}
							className="rounded-lg border border-[#16a34a] px-3 py-2 text-sm font-semibold text-[#16a34a]"
						>
							Về trang chủ
						</button>
					</div>
				</div>
			</section>

			<section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
				<div className="space-y-4">
					<section className="rounded-2xl bg-white p-4 shadow-sm">
						<div className="flex items-center justify-between gap-3">
							<h2 className="text-lg font-bold text-slate-800">Thông tin nhận hàng</h2>
							<button
								type="button"
								onClick={() => {
									window.history.pushState({}, '', '/profile?section=address&returnTo=cart')
									window.dispatchEvent(new PopStateEvent('popstate'))
								}}
								className="rounded-lg border border-[#86c790] px-3 py-1.5 text-sm font-semibold text-[#1f9542]"
							>
								Chỉnh sửa địa chỉ
							</button>
						</div>

						{isLoadingAddress && <p className="mt-3 text-sm text-slate-600">Đang tải địa chỉ mặc định...</p>}

						{!isLoadingAddress && !selectedCheckoutAddress && (
							<p className="mt-3 rounded-lg bg-[#fff7ed] p-3 text-sm font-medium text-[#b45309]">
								Bạn chưa có địa chỉ mặc định. Hãy vào hồ sơ để thêm địa chỉ trước khi thanh toán.
							</p>
						)}

						{selectedCheckoutAddress && (
							<div className="mt-3 rounded-xl border border-slate-200 p-3">
								<p className="text-sm font-semibold text-slate-800">
									{selectedCheckoutAddress.recipientName} - {selectedCheckoutAddress.phone}
								</p>
								<p className="mt-1 text-sm text-slate-700">{selectedCheckoutAddress.fullAddress}</p>
							</div>
						)}

						{isAddressPickerOpen && !isLoadingAddress && (
							<div className="mt-3 space-y-2 rounded-xl border border-[#d8efdc] bg-[#f7fcf8] p-3">
								{addresses.length === 0 && (
									<p className="text-sm text-slate-600">Bạn chưa có địa chỉ nào trong hồ sơ.</p>
								)}

								{addresses.map((item) => {
									const isSelected = item.id === selectedCheckoutAddress?.id

									return (
										<button
											key={item.id}
											type="button"
											onClick={() => {
												setSelectedAddressId(item.id)
												setIsAddressPickerOpen(false)
											}}
											className={`w-full rounded-lg border p-3 text-left transition ${isSelected
												? 'border-[#86c790] bg-[#e9f9ed]'
												: 'border-slate-200 bg-white hover:border-[#b7dfbe]'
												}`}
										>
											<p className="text-sm font-semibold text-slate-800">
												{item.recipientName} - {item.phone}
											</p>
											<p className="mt-1 text-sm text-slate-700">{item.fullAddress}</p>
											<p className="mt-1 text-xs font-medium text-[#15803d]">
												{isSelected ? 'Đang dùng cho đơn hàng này' : 'Bấm để chọn địa chỉ này'}
											</p>
										</button>
									)
								})}
							</div>
						)}
					</section>

					<section className="rounded-2xl bg-white p-4 shadow-sm">
						<h2 className="text-lg font-bold text-slate-800">Sản phẩm thanh toán</h2>

						{isLoadingCart && <p className="mt-3 text-sm text-slate-600">Đang tải sản phẩm...</p>}

						{!isLoadingCart && selectedItems.length === 0 && (
							<p className="mt-3 rounded-lg bg-[#fff7ed] p-3 text-sm font-medium text-[#b45309]">
								Không có sản phẩm được chọn. Vui lòng quay lại giỏ hàng và chọn sản phẩm cần thanh toán.
							</p>
						)}

						{selectedItems.length > 0 && (
							<div className="mt-3 space-y-3">
								{selectedItems.map((item) => (
									<article
										key={item.productId}
										className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[96px_1fr_auto]"
									>
										<div className="overflow-hidden rounded-lg bg-slate-100">
											<img
												src={item.productImage || 'https://via.placeholder.com/200x200?text=SP'}
												alt={item.productName}
												className="h-[96px] w-full object-cover"
											/>
										</div>
										<div>
											<h3 className="text-sm font-bold text-slate-800">{item.productName}</h3>
											<p className="mt-1 text-xs text-slate-500">Mã thuốc: {item.medicineCode || '-'}</p>
											{item.requiresPrescription && (
												<span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 border border-red-200">
													⚠️ Thuốc kê đơn
												</span>
											)}
											<p className="mt-2 text-sm text-slate-700">
												Đơn giá: <span className="font-semibold">{formatVnd(item.unitPrice)}</span>
											</p>
											<p className="text-sm text-slate-700">
												Số lượng: <span className="font-semibold">{item.quantity}</span>
											</p>
										</div>
										<p className="text-sm font-semibold text-[#ef4444]">{formatVnd(item.lineTotal)}</p>
									</article>
								))}
							</div>
						)}
					</section>

					{hasRxItems && (
						<section className="rounded-2xl bg-[#fffcf5] border border-[#fde68a] p-4 shadow-sm">
							<h2 className="text-lg font-bold text-[#d97706] flex items-center gap-2">
								<span role="img" aria-label="warning">⚠️</span> Đơn hàng cần có đơn thuốc
							</h2>
							<p className="mt-2 text-sm text-[#b45309]">
								Đơn hàng của bạn chứa sản phẩm bắt buộc phải có chỉ định của bác sĩ. Vui lòng tải lên hình ảnh đơn thuốc hợp lệ để dược sĩ kiểm tra.
							</p>
							<div className="mt-4">
								<label className="block w-full cursor-pointer rounded-xl border-2 border-dashed border-[#fcd34d] bg-white p-6 text-center hover:bg-[#fffbeb] transition">
									{prescriptionImage ? (
										<div className="flex flex-col items-center">
											<img src={prescriptionImage} alt="Đơn thuốc" className="h-32 object-contain mb-2 rounded-lg border" />
											<span className="text-sm font-medium text-[#d97706]">Nhấn để chọn ảnh khác</span>
										</div>
									) : (
										<div className="flex flex-col items-center">
											<span className="text-3xl mb-2">📸</span>
											<span className="text-sm font-medium text-[#d97706]">Tải lên hình ảnh đơn thuốc</span>
											<span className="mt-1 text-xs text-[#b45309]">Hỗ trợ JPG, PNG (tối đa 5MB)</span>
										</div>
									)}
									<input
										type="file"
										accept="image/*"
										className="hidden"
										onChange={handleImageUpload}
										disabled={isUploadingRx}
									/>
								</label>
							</div>
						</section>
					)}

					<section className="rounded-2xl bg-white p-4 shadow-sm">
						<h2 className="text-lg font-bold text-slate-800">Phương thức thanh toán</h2>
						<div className="mt-3 space-y-2">
							{paymentMethodOptions.map((option) => {
								const isSelected = paymentMethod === option.value

								return (
									<label
										key={option.value}
										className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${isSelected
											? 'border-[#bbf7d0] bg-[#f0fdf4]'
											: 'border-slate-200 bg-white'
											}`}
									>
										<input
											type="radio"
											name="paymentMethod"
											value={option.value}
											checked={isSelected}
											onChange={() => setPaymentMethod(option.value)}
											className="mt-1"
										/>
										<span>
											<span className="block text-sm font-medium text-slate-800">{option.label}</span>
											<span className="mt-1 block text-xs text-slate-600">{option.description}</span>
										</span>
									</label>
								)
							})}
						</div>

						{paymentMethod === 'bank_transfer' && (
							<div className="mt-3 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] p-3 text-sm text-slate-700">
								<p className="font-semibold text-slate-800">Thanh toán qua cổng VNPay</p>
								<p className="mt-1 text-xs text-slate-600">
									Sau khi xác nhận, hệ thống sẽ chuyển bạn đến VNPay để chọn ngân hàng và hoàn tất thanh toán an toàn.
								</p>
							</div>
						)}

						<textarea
							value={note}
							onChange={(event) => setNote(event.target.value)}
							placeholder="Ghi chú cho đơn hàng (không bắt buộc)"
							rows={3}
							className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-700 outline-none focus:border-[#16a34a]"
						/>
					</section>
				</div>

				<aside className="rounded-2xl bg-white p-4 shadow-sm">
					<h3 className="text-[28px] font-bold text-slate-800">Đơn hàng</h3>
					<div className="mt-4 space-y-3 border-b border-slate-200 pb-4 text-sm">
						<div className="flex items-center justify-between text-slate-600">
							<span>Số sản phẩm đã chọn</span>
							<span className="font-semibold text-slate-800">{selectedItems.length}</span>
						</div>
						<div className="flex items-center justify-between text-slate-600">
							<span>Tổng số lượng</span>
							<span className="font-semibold text-slate-800">{totalQuantity}</span>
						</div>
					</div>

					<div className="mt-4 flex items-center justify-between text-base font-bold text-slate-900">
						<span>Tổng thanh toán</span>
						<span className="text-[#ef4444]">{formatVnd(totalAmount)}</span>
					</div>

					<button
						type="button"
						onClick={() => void handlePlaceOrder()}
						disabled={!canSubmit}
						className="mt-4 h-12 w-full rounded-xl bg-[#35b548] text-lg font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[#9ca3af] disabled:hover:brightness-100"
					>
						{submitButtonLabel}
					</button>

					{!canSubmit && (
						<p className="mt-3 text-sm font-medium text-[#ef4444]">
							{!selectedCheckoutAddress
								? 'Vui lòng có địa chỉ mặc định trước khi thanh toán'
								: hasRxItems && !prescriptionImage
									? 'Vui lòng tải lên đơn thuốc hợp lệ'
									: 'Vui lòng chọn sản phẩm hợp lệ từ giỏ hàng'}
						</p>
					)}

					{submitError && <p className="mt-3 text-sm font-medium text-[#ef4444]">{submitError}</p>}
					{submitSuccess && <p className="mt-3 text-sm font-medium text-[#16a34a]">{submitSuccess}</p>}
				</aside>
			</section>
		</PharmacyLayout>
	)
}

export default CheckoutPage
