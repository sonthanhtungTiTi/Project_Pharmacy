import { useEffect, useMemo, useState } from 'react'
import PharmacyLayout from '../components/layout/layout'
import { getMyOrderDetail, type OrderData } from '../services/order.service'
import { checkVnpayOrderStatus } from '../services/vnpay.service'

type ResultViewStatus = 'loading' | 'success' | 'failed'

interface VnpayReturnParams {
  orderId: string
  responseCode: string
  message: string
  transactionNo: string
  payDate: string
  bankCode: string
  amount: number | null
}

interface PaymentSnapshot {
  orderId: string
  orderCode: string
  status: string
  paymentStatus: string
  paymentMethod: string
  transactionId: string
  paymentDate: string
  updatedAt: string
  amount: number | null
  responseCode: string
  message: string
  bankCode: string
}

const VNPAY_ORDER_ID_KEY = 'vnpayOrderId'

const parseVnpayReturnParams = (): VnpayReturnParams => {
  const params = new URLSearchParams(window.location.search)
  const amountParam = params.get('amount')
  const amountValue = amountParam !== null && amountParam !== '' ? Number(amountParam) : Number.NaN

  return {
    orderId: params.get('orderId') || '',
    responseCode: params.get('responseCode') || '',
    message: params.get('message') || '',
    transactionNo: params.get('transactionNo') || '',
    payDate: params.get('payDate') || '',
    bankCode: params.get('bankCode') || '',
    amount: Number.isNaN(amountValue) ? null : amountValue,
  }
}

const formatVnd = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-'
  }

  return `${new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value)))}d`
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '-'
  }

  if (/^\d{14}$/.test(value)) {
    const year = value.slice(0, 4)
    const month = value.slice(4, 6)
    const day = value.slice(6, 8)
    const hour = value.slice(8, 10)
    const minute = value.slice(10, 12)
    const second = value.slice(12, 14)
    const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString('vi-VN')
    }
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleString('vi-VN')
}

const getPaymentStatusLabel = (status: string) => {
  if (status === 'paid') return 'Da thanh toan'
  if (status === 'failed') return 'Thanh toan that bai'
  if (status === 'pending') return 'Dang xu ly'
  return 'Chua thanh toan'
}

const VnpayResultPage = () => {
  const [viewStatus, setViewStatus] = useState<ResultViewStatus>('loading')
  const [statusMessage, setStatusMessage] = useState('Dang xac nhan giao dich VNPAY...')
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [paymentSnapshot, setPaymentSnapshot] = useState<PaymentSnapshot | null>(null)

  useEffect(() => {
    const handleVnpayReturn = async () => {
      let shouldClearOrderId = false

      try {
        const returnParams = parseVnpayReturnParams()
        const orderId = returnParams.orderId || sessionStorage.getItem(VNPAY_ORDER_ID_KEY) || ''

        if (!orderId) {
          setViewStatus('failed')
          setStatusMessage('Khong tim thay thong tin don hang')
          return
        }

        const hasResponseCode = Boolean(returnParams.responseCode)
        const isSuccessFromReturn = returnParams.responseCode === '00'
        const initialPaymentStatus = isSuccessFromReturn
          ? 'paid'
          : hasResponseCode
            ? 'failed'
            : 'pending'

        setPaymentSnapshot({
          orderId,
          orderCode: '',
          status: 'pending',
          paymentStatus: initialPaymentStatus,
          paymentMethod: 'bank_transfer',
          transactionId: returnParams.transactionNo,
          paymentDate: returnParams.payDate,
          updatedAt: '',
          amount: returnParams.amount,
          responseCode: returnParams.responseCode,
          message: returnParams.message,
          bankCode: returnParams.bankCode,
        })

        if (hasResponseCode && !isSuccessFromReturn) {
          setViewStatus('failed')
          setStatusMessage(returnParams.message || 'Thanh toan that bai. Vui long thu lai.')
          shouldClearOrderId = true
        }

        if (isSuccessFromReturn) {
          setViewStatus('success')
          setStatusMessage(returnParams.message || 'Thanh toan VNPAY thanh cong. Dang dong bo don hang...')
          shouldClearOrderId = true
        }

        const loadOrderDetail = async () => {
          try {
            const detail = await getMyOrderDetail(orderId)
            setOrderData(detail)
            setPaymentSnapshot((prev) =>
              prev
                ? {
                    ...prev,
                    orderCode: detail.orderCode || prev.orderCode,
                    status: detail.status || prev.status,
                    paymentStatus: detail.paymentStatus || prev.paymentStatus,
                    paymentMethod: detail.paymentMethod || prev.paymentMethod,
                    transactionId: detail.transactionId || prev.transactionId,
                    paymentDate: detail.paymentDate || prev.paymentDate,
                    updatedAt: detail.updatedAt || prev.updatedAt,
                    amount:
                      typeof detail.totalAmount === 'number'
                        ? detail.totalAmount
                        : prev.amount,
                  }
                : prev,
            )
          } catch {
            // Best effort only.
          }
        }

        await loadOrderDetail()

        let attempts = 0
        const maxAttempts = 25
        let isSettled = false

        while (attempts < maxAttempts && !isSettled) {
          try {
            const statusResult = await checkVnpayOrderStatus(orderId)
            setPaymentSnapshot((prev) => ({
              orderId,
              orderCode: statusResult.orderCode || prev?.orderCode || '',
              status: statusResult.status || prev?.status || '',
              paymentStatus: statusResult.paymentStatus || prev?.paymentStatus || 'pending',
              paymentMethod: statusResult.paymentMethod || prev?.paymentMethod || 'bank_transfer',
              transactionId: statusResult.transactionId || prev?.transactionId || '',
              paymentDate: statusResult.paymentDate || prev?.paymentDate || '',
              updatedAt: statusResult.updatedAt || prev?.updatedAt || '',
              amount:
                typeof statusResult.totalAmount === 'number'
                  ? statusResult.totalAmount
                  : (prev?.amount ?? returnParams.amount),
              responseCode: prev?.responseCode || returnParams.responseCode,
              message: prev?.message || returnParams.message,
              bankCode: prev?.bankCode || returnParams.bankCode,
            }))

            if (statusResult.paymentStatus === 'paid') {
              isSettled = true
              setViewStatus('success')
              setStatusMessage('Thanh toan VNPAY thanh cong! Don hang cua ban da duoc cap nhat.')
              shouldClearOrderId = true
              await loadOrderDetail()
              break
            }

            if (statusResult.paymentStatus === 'failed' || statusResult.status === 'cancelled') {
              isSettled = true
              setViewStatus('failed')
              setStatusMessage('Thanh toan VNPAY that bai. Don hang da bi huy.')
              shouldClearOrderId = true
              break
            }
          } catch {
            // Continue polling while callback is syncing.
          }

          attempts += 1
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        if (!isSettled && !hasResponseCode) {
          setViewStatus('loading')
          setStatusMessage('Giao dich dang duoc xu ly. Vui long kiem tra lai trong muc don hang.')
        }
      } catch (error) {
        console.error('VNPay return handling error:', error)
        setViewStatus('failed')
        setStatusMessage('Co loi xay ra khi xu ly thanh toan VNPAY.')
        shouldClearOrderId = true
      } finally {
        if (shouldClearOrderId) {
          sessionStorage.removeItem(VNPAY_ORDER_ID_KEY)
        }
      }
    }

    void handleVnpayReturn()
  }, [])

  const displayedAmount = useMemo(() => {
    if (typeof orderData?.totalAmount === 'number') {
      return orderData.totalAmount
    }

    return paymentSnapshot?.amount ?? null
  }, [orderData?.totalAmount, paymentSnapshot?.amount])

  const displayedPaymentStatus = useMemo(() => {
    return orderData?.paymentStatus || paymentSnapshot?.paymentStatus || 'pending'
  }, [orderData?.paymentStatus, paymentSnapshot?.paymentStatus])

  const displayedOrderCode = orderData?.orderCode || paymentSnapshot?.orderCode || '-'
  const displayedTransactionId = orderData?.transactionId || paymentSnapshot?.transactionId || '-'
  const displayedPaymentTime =
    orderData?.paymentDate || paymentSnapshot?.paymentDate || paymentSnapshot?.updatedAt || orderData?.updatedAt || ''

  const handleBackHome = () => {
    window.location.href = '/'
  }

  const handleBackCart = () => {
    window.location.href = '/gio-hang'
  }

  const handleBackOrders = () => {
    const orderId = orderData?.id || paymentSnapshot?.orderId || ''
    if (orderId) {
      window.location.href = `/profile?section=orders&orderId=${encodeURIComponent(orderId)}`
      return
    }

    window.location.href = '/profile?section=orders'
  }

  return (
    <PharmacyLayout categories={[]}>
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div
              className={`grid grid-cols-1 gap-4 px-5 py-6 md:grid-cols-[1.2fr_1fr] md:px-6 ${
                viewStatus === 'success'
                  ? 'bg-[linear-gradient(120deg,#e8f9ee,#f8fffb)]'
                  : viewStatus === 'failed'
                    ? 'bg-[linear-gradient(120deg,#fff1f2,#fff8f8)]'
                    : 'bg-[linear-gradient(120deg,#eff6ff,#f8fafc)]'
              }`}
            >
              <div className="space-y-3">
                <h1 className="text-2xl font-black text-slate-900">
                  {viewStatus === 'success'
                    ? 'Thanh toan VNPAY thanh cong'
                    : viewStatus === 'failed'
                      ? 'Thanh toan VNPAY that bai'
                      : 'Dang xac nhan giao dich VNPAY'}
                </h1>
                <p className="text-sm text-slate-600">{statusMessage}</p>

                <div className="rounded-xl border border-white/70 bg-white/70 p-3 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">Ma don hang:</span> {displayedOrderCode}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Ma giao dich:</span> {displayedTransactionId}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">So tien thanh toan:</span> {formatVnd(displayedAmount)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
                  <p className="text-xs font-semibold text-slate-500">TRANG THAI</p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {viewStatus === 'success' ? 'THANH CONG' : viewStatus === 'failed' ? 'THAT BAI' : 'DANG XU LY'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">VNPay Payment Gateway</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_360px] md:p-6">
              <section className="rounded-xl border border-slate-200 bg-white">
                <header className="border-b border-slate-200 px-4 py-3">
                  <h2 className="text-base font-bold text-slate-900">Chi tiet giao dich</h2>
                </header>
                <div className="space-y-2 px-4 py-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Trang thai</span>
                    <span className={`font-semibold ${displayedPaymentStatus === 'paid' ? 'text-emerald-600' : displayedPaymentStatus === 'failed' ? 'text-red-600' : 'text-blue-600'}`}>
                      {getPaymentStatusLabel(displayedPaymentStatus)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Ma giao dich VNPay</span>
                    <span className="font-semibold">{displayedTransactionId}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Ma don hang</span>
                    <span className="font-semibold">{displayedOrderCode}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Thoi gian giao dich</span>
                    <span className="font-semibold">{formatDateTime(displayedPaymentTime)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Phuong thuc</span>
                    <span className="font-semibold">{(orderData?.paymentMethod || paymentSnapshot?.paymentMethod || 'bank_transfer').toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Ngan hang</span>
                    <span className="font-semibold">{paymentSnapshot?.bankCode || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">So tien</span>
                    <span className="font-semibold text-slate-900">{formatVnd(displayedAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Ma phan hoi</span>
                    <span className="font-semibold">{paymentSnapshot?.responseCode || '-'}</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <p>
                      <span className="font-semibold">Thong bao:</span> {paymentSnapshot?.message || statusMessage}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-base font-bold text-slate-900">Tom tat don hang</h2>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">So san pham</span>
                    <span className="font-semibold">{orderData?.items?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tong so luong</span>
                    <span className="font-semibold">{orderData?.totalQuantity || 0}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-500">Tong thanh toan</span>
                    <span className="text-base font-black text-emerald-600">{formatVnd(displayedAmount)}</span>
                  </div>
                </div>

                {orderData?.shippingAddress && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <p className="font-semibold text-slate-800">Thong tin nhan hang</p>
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
                <h2 className="text-base font-bold text-slate-900">San pham da mua</h2>
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
                      <p className="mt-1 text-xs text-slate-500">Ma thuoc: {item.medicineCode || '-'}</p>
                      <p className="mt-1 text-xs text-slate-600">So luong: {item.quantity} - Don gia: {formatVnd(item.unitPrice)}</p>
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
              Ve trang chu
            </button>
            <button
              onClick={handleBackCart}
              className="rounded-xl border border-[#35b548] bg-white px-4 py-2 text-sm font-semibold text-[#35b548] transition hover:bg-[#f0fdf4]"
            >
              Quay lai gio hang
            </button>
            <button
              onClick={handleBackOrders}
              className="rounded-xl bg-[#35b548] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              Xem don hang
            </button>
          </div>
        </div>
      </div>
    </PharmacyLayout>
  )
}

export default VnpayResultPage
