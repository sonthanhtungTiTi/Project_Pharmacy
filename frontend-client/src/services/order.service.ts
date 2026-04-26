const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export type PaymentMethod = 'cod' | 'bank_transfer' | 'e_wallet' | 'momo'

export interface CheckoutPayload {
	addressId: string
	note?: string
	paymentMethod?: PaymentMethod
	selectedProductIds?: string[]
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

export interface OrderData {
	id: string
	orderCode: string
	userId: string
	status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled'
	paymentMethod: PaymentMethod
	paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
	bankTransferInfo?: {
		bankName: string
		accountNumber: string
		accountHolder: string
		transferContent: string
	} | null
	transactionId?: string | null
	paymentDate?: string | null
	totalQuantity: number
	totalAmount: number
	note: string
	adminNote: string
	cancelReason: string
	placedAt: string
	shippingAddress: {
		addressId: string
		label: 'home' | 'office' | 'other'
		recipientName: string
		phone: string
		provinceName: string
		districtName: string
		wardName: string
		street: string
		note: string
		fullAddress: string
	}
	items: OrderItem[]
	createdAt: string
	updatedAt: string
}

interface OrderResponse {
	success: boolean
	message: string
	data?: OrderData
	error?: string
}

export interface OrderPagination {
	page: number
	limit: number
	total: number
	totalPages: number
}

export interface OrderListPayload {
	items: OrderData[]
	pagination: OrderPagination
}

interface OrderListResponse {
	success: boolean
	message: string
	data?: OrderListPayload
	error?: string
}

const getAccessToken = () => localStorage.getItem('clientAccessToken') || ''

const getAuthHeaders = () => {
	const accessToken = getAccessToken()
	if (!accessToken) {
		throw new Error('Vui lòng đăng nhập để đặt hàng')
	}

	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${accessToken}`,
	}
}

export const checkoutFromCart = async (payload: CheckoutPayload) => {
	const response = await fetch(`${API_BASE_URL}/client/orders/checkout`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	})

	const data = (await response.json()) as OrderResponse
	if (!response.ok || !data.success || !data.data) {
		throw new Error(data.message || data.error || 'Checkout failed')
	}

	return data.data
}

export const getMyOrders = async ({ page = 1, limit = 10 }: { page?: number; limit?: number } = {}) => {
	const query = new URLSearchParams({
		page: String(Math.max(1, page)),
		limit: String(Math.max(1, limit)),
	})

	const response = await fetch(`${API_BASE_URL}/client/orders?${query.toString()}`, {
		headers: getAuthHeaders(),
	})

	const data = (await response.json()) as OrderListResponse
	if (!response.ok || !data.success || !data.data) {
		throw new Error(data.message || data.error || 'Fetch orders failed')
	}

	return data.data
}

export const getMyOrderDetail = async (orderId: string) => {
	if (!orderId) {
		throw new Error('Order ID is required')
	}

	const response = await fetch(`${API_BASE_URL}/client/orders/${encodeURIComponent(orderId)}`, {
		headers: getAuthHeaders(),
	})

	const data = (await response.json()) as OrderResponse
	if (!response.ok || !data.success || !data.data) {
		throw new Error(data.message || data.error || 'Fetch order detail failed')
	}

	return data.data
}
