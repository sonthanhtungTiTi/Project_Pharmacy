import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Order } from '../services/order.service'
import orderService from '../services/order.service'

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchOrders()
  }, [page, filterStatus])

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const filters = filterStatus !== 'all' ? { status: filterStatus } : {}
      const response = await orderService.getOrders(page, 20, filters)
      setOrders(response.data.items || [])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load orders'
      console.error('Error fetching orders:', errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus)
      fetchOrders()
    } catch (err) {
      alert('Failed to update order status')
    }
  }

  const filteredOrders = orders.filter((order) =>
    order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'shipping':
        return 'bg-purple-100 text-purple-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'unpaid':
        return 'text-red-600'
      case 'pending':
        return 'text-amber-600'
      case 'paid':
        return 'text-green-600'
      case 'failed':
        return 'text-red-700'
      case 'refunded':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
          <p className="text-gray-600 mt-1">Xem và quản lý tất cả đơn hàng từ khách hàng</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Tìm kiếm theo mã đơn, tên khách hàng, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="shipping">Đang giao hàng</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block mb-4">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600">Lỗi: {error}</p>
            <button
              onClick={fetchOrders}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Thử lại
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Không tìm thấy đơn hàng nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">Mã đơn</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">Khách hàng</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">Số điện thoại</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">Địa chỉ</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">Số lượng</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">Tổng tiền</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">Thanh toán</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">Trạng thái</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">Ngày đặt</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        {order.orderCode}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.customer.fullName}</p>
                        <p className="text-xs text-gray-500">{order.customer.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.customer.phone}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-xs">
                        <p className="truncate">{order.shippingAddress.fullAddress}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.totalQuantity}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus === 'unpaid' && 'Chưa thanh toán'}
                        {order.paymentStatus === 'pending' && 'Đang chờ thanh toán'}
                        {order.paymentStatus === 'paid' && 'Đã thanh toán'}
                        {order.paymentStatus === 'failed' && 'Thanh toán thất bại'}
                        {order.paymentStatus === 'refunded' && 'Hoàn tiền'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                        className={`text-xs font-semibold px-3 py-1 rounded-full border-none cursor-pointer ${getStatusColor(order.status)}`}
                      >
                        <option value="pending">Chờ xác nhận</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="shipping">Đang giao hàng</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(order.placedAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                        >
                          Chi tiết
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Bạn có chắc muốn hủy đơn hàng này?')) {
                              handleStatusChange(order.id, 'cancelled')
                            }
                          }}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                        >
                          Hủy
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredOrders.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Tổng: {filteredOrders.length} đơn hàng</p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Trước
            </button>
            <span className="px-3 py-2 text-sm text-gray-700">Trang {page}</span>
            <button
              onClick={() => setPage(page + 1)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Tiếp
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
