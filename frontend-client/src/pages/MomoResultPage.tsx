import { useEffect, useMemo, useState } from 'react'
import PharmacyLayout from '../components/layout/layout'
import { checkOrderPaymentStatus, getOrderDetails } from '../services/momo.service'
import type { OrderData } from '../services/order.service'

type ResultViewStatus = 'loading' | 'success' | 'failed'

interface MomoReturnParams {
	orderId: string
	resultCode: number | null
	message: string
	transId: string
	responseTime: string
	orderInfo: string
	amount: number | null
	payType: string
}

interface TransactionSnapshot {
	orderId: string
	orderCode: string
	paymentStatus: string
	paymentMethod: string
	transactionId: string
	paymentDate: string
	updatedAt: string
	amount: number | null
	resultCode: number | null
	message: string
	orderInfo: string
	payType: string
}

const parseMomoReturnParams = (): MomoReturnParams => {
	const params = new URLSearchParams(window.location.search)
	const amountParam = params.get('amount')
	const resultCodeParam = params.get('resultCode')
	const amountValue = amountParam !== null && amountParam !== '' ? Number(amountParam) : Number.NaN
	const resultCodeValue =
		resultCodeParam !== null && resultCodeParam !== '' ? Number(resultCodeParam) : Number.NaN

	return {
		orderId: params.get('orderId') || '',
		resultCode: Number.isNaN(resultCodeValue) ? null : resultCodeValue,
		message: params.get('message') || '',
		transId: params.get('transId') || '',
		responseTime: params.get('responseTime') || '',
		orderInfo: params.get('orderInfo') || '',
		amount: Number.isNaN(amountValue) ? null : amountValue,
		payType: params.get('payType') || '',
	}
}

const formatVnd = (value: number | null | undefined) => {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return '-'
	}

	return `${new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value)))}đ`
}

const formatDateTime = (value: string | null | undefined) => {
	if (!value) {
		return '-'
	}

	const numericValue = Number(value)
	const maybeDate = Number.isNaN(numericValue) ? new Date(value) : new Date(numericValue)
	if (Number.isNaN(maybeDate.getTime())) {
		return '-'
	}

	return maybeDate.toLocaleString('vi-VN')
}

const paymentStatusLabel = (status: string) => {
	if (status === 'paid') return 'Đã thanh toán'
	if (status === 'failed') return 'Thanh toán thất bại'
	if (status === 'pending') return 'Đang xử lý'
	return 'Chưa thanh toán'
}

const MomoResultPage = () => {
	const [viewStatus, setViewStatus] = useState<ResultViewStatus>('loading')
	const [orderData, setOrderData] = useState<OrderData | null>(null)
	const [statusMessage, setStatusMessage] = useState('Đang xác nhận giao dịch MoMo...')
	const [transactionSnapshot, setTransactionSnapshot] = useState<TransactionSnapshot | null>(null)

	useEffect(() => {
		const handleMomoReturn = async () => {
			let shouldClearMomoOrderId = false

			try {
				const momoReturnParams = parseMomoReturnParams()
				const orderId = momoReturnParams.orderId || sessionStorage.getItem('momoOrderId') || ''

				if (!orderId) {
					setViewStatus('failed')
					setStatusMessage('Không tìm thấy thông tin đơn hàng')
					return
				}

				setTransactionSnapshot({
					orderId,
					orderCode: '',
					paymentStatus: momoReturnParams.resultCode === 0 ? 'paid' : 'failed',
					paymentMethod: momoReturnParams.payType || 'momo',
					transactionId: momoReturnParams.transId,
					paymentDate: momoReturnParams.responseTime,
					updatedAt: '',
					amount: momoReturnParams.amount,
					resultCode: momoReturnParams.resultCode,
					message: momoReturnParams.message,
					orderInfo: momoReturnParams.orderInfo,
					payType: momoReturnParams.payType,
				})

				if (momoReturnParams.resultCode !== null && momoReturnParams.resultCode !== 0) {
					setViewStatus('failed')
					setStatusMessage(momoReturnParams.message || 'Thanh toán thất bại. Vui lòng thử lại.')
					shouldClearMomoOrderId = true
					return
				}

				if (momoReturnParams.resultCode === 0) {
					setViewStatus('success')
					setStatusMessage(
						momoReturnParams.message ||
							'Thanh toán MoMo thành công. Đơn hàng của bạn sẽ được đồng bộ trong giây lát.'
					)
					shouldClearMomoOrderId = true
				}

				// Ưu tiên hiển thị thông tin đơn hàng ngay khi quay về từ MoMo
				try {
					const orderDetails = await getOrderDetails(orderId)
					const resolvedOrder = orderDetails?.data || null
					setOrderData(resolvedOrder)
					if (resolvedOrder) {
						setTransactionSnapshot((prev) => ({
							orderId,
							orderCode: resolvedOrder.orderCode || prev?.orderCode || '',
							paymentStatus:
								momoReturnParams.resultCode === 0
									? 'paid'
									: (resolvedOrder.paymentStatus || prev?.paymentStatus || 'pending'),
							paymentMethod:
								resolvedOrder.paymentMethod || prev?.paymentMethod || momoReturnParams.payType || 'momo',
							transactionId: resolvedOrder.transactionId || prev?.transactionId || momoReturnParams.transId,
							paymentDate:
								resolvedOrder.paymentDate || prev?.paymentDate || momoReturnParams.responseTime || '',
							updatedAt: resolvedOrder.updatedAt || prev?.updatedAt || '',
							amount:
								typeof resolvedOrder.totalAmount === 'number'
									? resolvedOrder.totalAmount
									: (prev?.amount ?? momoReturnParams.amount),
							resultCode: prev?.resultCode ?? momoReturnParams.resultCode,
							message: prev?.message || momoReturnParams.message,
							orderInfo: prev?.orderInfo || momoReturnParams.orderInfo,
							payType: prev?.payType || momoReturnParams.payType,
						}))
					}
				} catch {
					// Có thể vừa thanh toán xong nên dữ liệu đơn chưa sync ngay.
				}

				let attempts = 0
				const maxAttempts = 30
				let isSettled = false
				const momoReturnSuccess = momoReturnParams.resultCode === 0

				while (attempts < maxAttempts && !isSettled) {
					try {
						const statusResult = await checkOrderPaymentStatus(orderId)
						setTransactionSnapshot((prev) => ({
							orderId,
							orderCode: statusResult.orderCode || prev?.orderCode || '',
							paymentStatus:
								momoReturnSuccess
									? 'paid'
									: (statusResult.paymentStatus || prev?.paymentStatus || 'pending'),
							paymentMethod: statusResult.paymentMethod || prev?.paymentMethod || 'momo',
							transactionId: statusResult.transactionId || prev?.transactionId || '',
							paymentDate: statusResult.paymentDate || prev?.paymentDate || '',
							updatedAt: statusResult.updatedAt || prev?.updatedAt || '',
							amount:
								typeof statusResult.totalAmount === 'number'
									? statusResult.totalAmount
									: (prev?.amount ?? momoReturnParams.amount),
							resultCode: prev?.resultCode ?? momoReturnParams.resultCode,
							message: prev?.message || momoReturnParams.message,
							orderInfo: prev?.orderInfo || momoReturnParams.orderInfo,
							payType: prev?.payType || momoReturnParams.payType,
						}))

						if (statusResult.paymentStatus === 'paid') {
							isSettled = true
							shouldClearMomoOrderId = true
							setViewStatus('success')
							setStatusMessage('Thanh toán Momo thành công! Đơn hàng của bạn đã được xác nhận.')

							const orderDetails = await getOrderDetails(orderId)
							const resolvedOrder = orderDetails?.data || null
							setOrderData(resolvedOrder)
							break
						}

				if (statusResult.paymentStatus === 'failed') {
							isSettled = true
							shouldClearMomoOrderId = true
							setViewStatus('failed')
							setStatusMessage('Thanh toán thất bại. Đơn hàng đã hủy tự động.')
							break
						}
					} catch {
						// Continue polling when callback has not updated yet.
					}

					attempts++
					await new Promise((resolve) => setTimeout(resolve, 1000))
				}

				if (!isSettled && attempts >= maxAttempts && !momoReturnSuccess) {
					setViewStatus('loading')
					setStatusMessage(
						'Giao dịch đang xử lý trên hệ thống. Vui lòng kiểm tra lại trong mục đơn hàng của bạn.'
					)
				}
			} catch (error) {
				console.error('Error handling Momo return:', error)
				setViewStatus('failed')
				setStatusMessage('Có lỗi xảy ra khi xử lý thanh toán.')
				shouldClearMomoOrderId = true
			} finally {
				if (shouldClearMomoOrderId) {
					sessionStorage.removeItem('momoOrderId')
				}
			}
		}

		handleMomoReturn()
	}, [])

	const handleBackHome = () => {
		window.location.href = '/'
	}

	const handleBackCart = () => {
		window.location.href = '/gio-hang'
	}

	const handleBackOrders = () => {
		const orderId = orderData?.id || transactionSnapshot?.orderId || ''
		if (orderId) {
			window.location.href = `/profile?section=orders&orderId=${encodeURIComponent(orderId)}`
			return
		}

		window.location.href = '/profile?section=orders'
	}

	const displayedAmount = useMemo(() => {
		if (typeof orderData?.totalAmount === 'number') {
			return orderData.totalAmount
		}

		return transactionSnapshot?.amount ?? null
	}, [orderData?.totalAmount, transactionSnapshot?.amount])

	const displayedPaymentStatus = useMemo(() => {
		if (transactionSnapshot?.resultCode === 0) {
			return 'paid'
		}

		return orderData?.paymentStatus || transactionSnapshot?.paymentStatus || 'pending'
	}, [orderData?.paymentStatus, transactionSnapshot?.paymentStatus, transactionSnapshot?.resultCode])
	const displayedTransactionId = orderData?.transactionId || transactionSnapshot?.transactionId || '-'
	const displayedOrderCode = orderData?.orderCode || transactionSnapshot?.orderCode || '-'
	const displayedPaymentTime =
		orderData?.paymentDate ||
		transactionSnapshot?.paymentDate ||
		transactionSnapshot?.updatedAt ||
		orderData?.updatedAt ||
		''

	return (
		<PharmacyLayout categories={[]}>
			<div className="min-h-screen bg-slate-50 p-4 md:p-6">
				<div className="mx-auto max-w-5xl space-y-4">
					<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
						<div
							className={`grid grid-cols-1 gap-4 px-5 py-6 md:grid-cols-[1.25fr_1fr] md:px-6 ${
								viewStatus === 'success'
									? 'bg-[linear-gradient(120deg,#e8f9ee,#f8fffb)]'
									: viewStatus === 'failed'
										? 'bg-[linear-gradient(120deg,#fff1f2,#fff8f8)]'
										: 'bg-[linear-gradient(120deg,#eff6ff,#f8fafc)]'
							}`}
						>
							<div className="space-y-3">
								<div className="flex items-center gap-3">
									<div
										className={`grid h-12 w-12 place-items-center rounded-full ${
											viewStatus === 'success'
												? 'bg-emerald-500 text-white'
												: viewStatus === 'failed'
													? 'bg-red-500 text-white'
													: 'bg-blue-500 text-white'
										}`}
									>
										{viewStatus === 'success' ? (
											<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
												<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
											</svg>
										) : viewStatus === 'failed' ? (
											<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
												<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
											</svg>
										) : (
											<div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
										)}
									</div>
									<div>
										<h1 className="text-2xl font-black text-slate-900">
											{viewStatus === 'success'
												? 'Thanh toán QR MoMo thành công'
												: viewStatus === 'failed'
													? 'Thanh toán MoMo thất bại'
													: 'Đang xác nhận giao dịch MoMo'}
										</h1>
										<p className="mt-1 text-sm text-slate-600">{statusMessage}</p>
									</div>
								</div>

								<div className="rounded-xl border border-white/70 bg-white/70 p-3 text-sm text-slate-700">
									<p>
										<span className="font-semibold">Mã đơn hàng:</span> {displayedOrderCode}
									</p>
									<p className="mt-1">
										<span className="font-semibold">Mã giao dịch:</span> {displayedTransactionId}
									</p>
									<p className="mt-1">
										<span className="font-semibold">Số tiền thanh toán:</span> {formatVnd(displayedAmount)}
									</p>
								</div>
							</div>

							<div className="flex items-center justify-center">
								<div className="relative h-[170px] w-[170px]">
									<div className="absolute inset-0 rounded-full bg-emerald-100" />
									<div className="absolute inset-3 rounded-full border-2 border-emerald-300" />
									<div className="absolute inset-6 rounded-full bg-white shadow-inner" />
									<div className="absolute inset-0 grid place-items-center">
										<div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
											<p className="text-xs font-semibold text-slate-500">GIAO DỊCH</p>
											<p className="mt-1 text-lg font-black text-slate-900">{viewStatus === 'success' ? 'THÀNH CÔNG' : viewStatus === 'failed' ? 'THẤT BẠI' : 'ĐANG XỬ LÝ'}</p>
											<p className="mt-1 text-xs text-slate-500">MoMo QR Payment</p>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_360px] md:p-6">
							<section className="rounded-xl border border-slate-200 bg-white">
								<header className="border-b border-slate-200 px-4 py-3">
									<h2 className="text-base font-bold text-slate-900">Chi tiết giao dịch</h2>
								</header>
								<div className="space-y-2 px-4 py-3 text-sm text-slate-700">
									<div className="flex items-center justify-between gap-3">
										<span className="text-slate-500">Trạng thái</span>
										<span className={`font-semibold ${displayedPaymentStatus === 'paid' ? 'text-emerald-600' : displayedPaymentStatus === 'failed' ? 'text-red-600' : 'text-blue-600'}`}>
											{paymentStatusLabel(displayedPaymentStatus)}
										</span>
									</div>
									<div className="flex items-center justify-between gap-3">
										<span className="text-slate-500">Mã giao dịch</span>
										<span className="font-semibold">{displayedTransactionId}</span>
									</div>
									<div className="flex items-center justify-between gap-3">
										<span className="text-slate-500">Mã đơn hàng</span>
										<span className="font-semibold">{displayedOrderCode}</span>
									</div>
									<div className="flex items-center justify-between gap-3">
										<span className="text-slate-500">Thời gian giao dịch</span>
										<span className="font-semibold">{formatDateTime(displayedPaymentTime)}</span>
									</div>
									<div className="flex items-center justify-between gap-3">
										<span className="text-slate-500">Phương thức</span>
										<span className="font-semibold">{(orderData?.paymentMethod || transactionSnapshot?.paymentMethod || 'momo').toUpperCase()}</span>
									</div>
									<div className="flex items-center justify-between gap-3">
										<span className="text-slate-500">Số tiền</span>
										<span className="font-semibold text-slate-900">{formatVnd(displayedAmount)}</span>
									</div>
									<div className="flex items-center justify-between gap-3">
										<span className="text-slate-500">Mã phản hồi</span>
										<span className="font-semibold">{transactionSnapshot?.resultCode ?? '-'}</span>
									</div>
									<div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
										<p>
											<span className="font-semibold">Thông báo:</span> {transactionSnapshot?.message || statusMessage}
										</p>
										{transactionSnapshot?.orderInfo && (
											<p className="mt-1">
												<span className="font-semibold">Nội dung:</span> {transactionSnapshot.orderInfo}
											</p>
										)}
									</div>
								</div>
							</section>

							<section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
								<h2 className="text-base font-bold text-slate-900">Tóm tắt đơn hàng</h2>
								<div className="space-y-2 text-sm text-slate-700">
									<div className="flex items-center justify-between">
										<span className="text-slate-500">Số sản phẩm</span>
										<span className="font-semibold">{orderData?.items?.length || 0}</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-slate-500">Tổng số lượng</span>
										<span className="font-semibold">{orderData?.totalQuantity || 0}</span>
									</div>
									<div className="flex items-center justify-between border-t border-slate-200 pt-2">
										<span className="text-slate-500">Tổng thanh toán</span>
										<span className="text-base font-black text-emerald-600">{formatVnd(displayedAmount)}</span>
									</div>
								</div>

								{orderData?.shippingAddress && (
									<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
										<p className="font-semibold text-slate-800">Thông tin nhận hàng</p>
										<p className="mt-1">{orderData.shippingAddress.recipientName} - {orderData.shippingAddress.phone}</p>
										<p className="mt-1">{orderData.shippingAddress.fullAddress}</p>
									</div>
								)}
							</section>
						</div>
					</div>

					{orderData?.items?.length ? (
						<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
							<header className="border-b border-slate-200 px-4 py-3 md:px-6">
								<h2 className="text-base font-bold text-slate-900">Sản phẩm đã mua</h2>
							</header>
							<div className="divide-y divide-slate-100">
								{orderData.items.map((item) => (
									<div key={item.productId} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[80px_1fr_auto] md:px-6">
										<div className="h-[72px] w-[72px] overflow-hidden rounded-lg bg-slate-100">
											<img
												src={item.productImage || 'https://via.placeholder.com/200x200?text=SP'}
												alt={item.productName}
												className="h-full w-full object-cover"
											/>
										</div>
										<div>
											<p className="text-sm font-bold text-slate-800">{item.productName}</p>
											<p className="mt-1 text-xs text-slate-500">Mã thuốc: {item.medicineCode || '-'}</p>
											<p className="mt-1 text-xs text-slate-600">Số lượng: {item.quantity} - Đơn giá: {formatVnd(item.unitPrice)}</p>
										</div>
										<p className="text-sm font-semibold text-slate-900">{formatVnd(item.lineTotal)}</p>
									</div>
								))}
							</div>
						</section>
					) : null}

					<div className="flex flex-wrap items-center gap-3">
						<button
							onClick={handleBackHome}
							className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
						>
							Về trang chủ
						</button>
						<button
							onClick={handleBackCart}
							className="rounded-xl border border-[#35b548] bg-white px-4 py-2 text-sm font-semibold text-[#35b548] transition hover:bg-[#f0fdf4]"
						>
							Quay lại giỏ hàng
						</button>
						<button
							onClick={handleBackOrders}
							className="rounded-xl bg-[#35b548] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
						>
							Xem đơn hàng
						</button>
					</div>
				</div>
			</div>
		</PharmacyLayout>
	)
}

export default MomoResultPage
