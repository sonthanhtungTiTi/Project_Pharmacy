import { apiGet, apiPatch } from '../utils/api.utils'

export interface OrderCustomer {
  id: string
  fullName: string
  email: string
  phone: string
}

export interface ShippingAddress {
  addressId: string
  label: string
  recipientName: string
  phone: string
  provinceName: string
  districtName: string
  wardName: string
  street: string
  note: string
  fullAddress: string
}

export interface OrderItem {
  productId: string
  medicineCode: string
  productName: string
  productImage: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface Order {
  id: string
  orderCode: string
  status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled'
  paymentMethod: 'cod' | 'bank_transfer' | 'e_wallet' | 'momo'
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
  totalQuantity: number
  totalAmount: number
  note: string
  adminNote: string
  cancelReason: string
  placedAt: string
  createdAt: string
  updatedAt: string
  customer: OrderCustomer
  shippingAddress: ShippingAddress
  items: OrderItem[]
}

export interface OrdersResponse {
  success: boolean
  message: string
  data: {
    items: Order[]
    pagination?: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
}

const orderService = {
  getOrders: async (page = 1, limit = 10, filters?: any): Promise<OrdersResponse> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...filters,
    })

    return await apiGet(`/admin/orders?${params.toString()}`)
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const data = await apiGet(`/admin/orders/${orderId}`)
    return data.data
  },

  updateOrderStatus: async (orderId: string, status: Order['status']): Promise<Order> => {
    const data = await apiPatch(`/admin/orders/${orderId}/status`, { status })
    return data.data
  },

  cancelOrder: async (orderId: string, reason: string): Promise<Order> => {
    const data = await apiPatch(`/admin/orders/${orderId}/status`, {
      status: 'cancelled',
      adminNote: reason,
    })
    return data.data
  },
}

export default orderService
