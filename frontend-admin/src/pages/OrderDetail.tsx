import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import orderService, { type Order } from '../services/order.service'

const orderStatusOptions: Array<{ value: Order['status']; label: string }> = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao hàng' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const formatDateTime = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('vi-VN')
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)

const getPaymentStatusLabel = (status: Order['paymentStatus']) => {
  switch (status) {
    case 'unpaid':
      return 'Chưa thanh toán'
    case 'pending':
      return 'Đang chờ thanh toán'
    case 'paid':
      return 'Đã thanh toán'
    case 'failed':
      return 'Thanh toán thất bại'
    case 'refunded':
      return 'Đã hoàn tiền'
    default:
      return status
  }
}

export default function OrderDetail() {
  const navigate = useNavigate()
  const { orderId = '' } = useParams()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const statusLabel = useMemo(
    () => orderStatusOptions.find((opt) => opt.value === order?.status)?.label || order?.status || '-',
    [order?.status],
  )

  const loadOrder = async () => {
    if (!orderId) {
      setError('Thiếu mã đơn hàng')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await orderService.getOrderById(orderId)
      setOrder(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được chi tiết đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const handleStatusChange = async (nextStatus: Order['status']) => {
    if (!order) return

    setUpdatingStatus(true)
    try {
      const updated = await orderService.updateOrderStatus(order.id, nextStatus)
      setOrder(updated)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại'
      alert(message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
        <p className="text-gray-600">Đang tải chi tiết đơn hàng...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
        <p className="text-red-600">{error || 'Không tìm thấy đơn hàng'}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={loadOrder}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Thử lại
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Quay lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chi tiết đơn hàng</h1>
          <p className="text-gray-600 mt-1">Mã đơn: {order.orderCode}</p>
        </div>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Quay lại danh sách
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Thông tin khách hàng</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
              <p>
                <span className="font-medium">Họ tên:</span> {order.customer.fullName || '-'}
              </p>
              <p>
                <span className="font-medium">Email:</span> {order.customer.email || '-'}
              </p>
              <p>
                <span className="font-medium">Số điện thoại:</span> {order.customer.phone || '-'}
              </p>
            </div>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Địa chỉ giao hàng</h2>
            <p className="text-sm text-gray-700">{order.shippingAddress.fullAddress || '-'}</p>
            {!!order.shippingAddress.note && (
              <p className="text-sm text-gray-500 mt-2">Ghi chú: {order.shippingAddress.note}</p>
            )}
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Sản phẩm</h2>
            {order.items.length === 0 ? (
              <p className="text-sm text-gray-500">Không có sản phẩm trong đơn hàng</p>
            ) : (
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={`${order.id}-${item.productId}-${item.medicineCode}`} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500 mt-1">Mã thuốc: {item.medicineCode || '-'}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">{formatCurrency(item.lineTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Trạng thái</h2>
            <div>
              <p className="text-sm text-gray-500 mb-1">Trạng thái hiện tại</p>
              <p className="text-sm font-medium text-gray-900">{statusLabel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Cập nhật trạng thái</p>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value as Order['status'])}
                disabled={updatingStatus}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                {orderStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {updatingStatus && <p className="text-xs text-blue-600">Đang cập nhật trạng thái...</p>}
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-2 text-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Thanh toán</h2>
            <p>
              <span className="text-gray-500">Phương thức:</span>{' '}
              <span className="font-medium text-gray-900">{order.paymentMethod}</span>
            </p>
            <p>
              <span className="text-gray-500">Trạng thái:</span>{' '}
              <span className="font-medium text-gray-900">{getPaymentStatusLabel(order.paymentStatus)}</span>
            </p>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-2 text-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Tổng quan</h2>
            <p>
              <span className="text-gray-500">Tổng số lượng:</span>{' '}
              <span className="font-medium text-gray-900">{order.totalQuantity}</span>
            </p>
            <p>
              <span className="text-gray-500">Tổng tiền:</span>{' '}
              <span className="font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</span>
            </p>
            <p>
              <span className="text-gray-500">Ngày đặt:</span>{' '}
              <span className="font-medium text-gray-900">{formatDateTime(order.placedAt)}</span>
            </p>
            <p>
              <span className="text-gray-500">Cập nhật:</span>{' '}
              <span className="font-medium text-gray-900">{formatDateTime(order.updatedAt)}</span>
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
