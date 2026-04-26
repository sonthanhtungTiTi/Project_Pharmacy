const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

const getAccessToken = () => localStorage.getItem('clientAccessToken') || ''

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getAccessToken()}`,
})

export class VnpayPaymentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VnpayPaymentError'
  }
}

export type VnpayLanguage = 'vn' | 'en'

export interface CreateVnpayPaymentPayload {
  orderId: string
  bankCode?: string
  language?: VnpayLanguage
  orderInfo?: string
}

interface CreateVnpayPaymentResponse {
  success: boolean
  message?: string
  payUrl?: string
  orderId?: string
  orderCode?: string
}

export interface VnpayOrderStatusData {
  orderId: string
  orderCode: string
  totalAmount: number
  status: string
  paymentStatus: string
  paymentMethod: string
  transactionId: string | null
  paymentDate: string | null
  updatedAt: string | null
}

interface VnpayOrderStatusResponse {
  success: boolean
  message?: string
  orderId?: string
  orderCode?: string
  totalAmount?: number
  status?: string
  paymentStatus?: string
  paymentMethod?: string
  transactionId?: string | null
  paymentDate?: string | null
  updatedAt?: string | null
}

export const createVnpayPayment = async (payload: CreateVnpayPaymentPayload) => {
  try {
    const response = await fetch(`${API_URL}/client/vnpay/create-payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })

    const data = (await response.json().catch(() => null)) as CreateVnpayPaymentResponse | null

    if (!response.ok || !data?.success || !data?.payUrl) {
      throw new VnpayPaymentError(data?.message || 'Khong tao duoc lien ket thanh toan VNPAY')
    }

    return data
  } catch (error) {
    if (error instanceof VnpayPaymentError) {
      throw error
    }

    throw new VnpayPaymentError(error instanceof Error ? error.message : 'Khong tao duoc lien ket thanh toan VNPAY')
  }
}

export const checkVnpayOrderStatus = async (orderId: string): Promise<VnpayOrderStatusData> => {
  if (!orderId) {
    throw new Error('Order ID is required')
  }

  const response = await fetch(`${API_URL}/client/vnpay/order-status/${encodeURIComponent(orderId)}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })

  const data = (await response.json().catch(() => null)) as VnpayOrderStatusResponse | null

  if (!response.ok || !data?.success || !data.orderId || !data.orderCode) {
    throw new Error(data?.message || 'Khong the lay trang thai thanh toan VNPAY')
  }

  return {
    orderId: data.orderId,
    orderCode: data.orderCode,
    totalAmount: Number(data.totalAmount || 0),
    status: data.status || '',
    paymentStatus: data.paymentStatus || '',
    paymentMethod: data.paymentMethod || '',
    transactionId: data.transactionId || null,
    paymentDate: data.paymentDate || null,
    updatedAt: data.updatedAt || null,
  }
}
