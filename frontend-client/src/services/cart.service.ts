const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export interface CartItem {
	productId: string
	medicineCode: string
	productName: string
	productImage: string
	unitPrice: number
	quantity: number
	lineTotal: number
}

export interface CartData {
	userId: string
	items: CartItem[]
	totalQuantity: number
	totalAmount: number
	updatedAt: string | null
}

interface CartResponse {
	success: boolean
	message: string
	data?: CartData
	error?: string
}

const getAccessToken = () => localStorage.getItem('clientAccessToken') || ''

const getAuthHeaders = () => {
	const accessToken = getAccessToken()

	if (!accessToken) {
		throw new Error('Vui lòng đăng nhập để sử dụng giỏ hàng')
	}

	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${accessToken}`,
	}
}

const parseCartResponse = async (response: Response) => {
	const payload = (await response.json()) as CartResponse

	if (!response.ok || !payload.success || !payload.data) {
		throw new Error(payload.message || payload.error || 'Cart request failed')
	}

	return payload.data
}

export const getCart = async () => {
	const response = await fetch(`${API_BASE_URL}/client/cart`, {
		method: 'GET',
		headers: getAuthHeaders(),
	})

	return parseCartResponse(response)
}

export const addToCart = async (productId: string, quantity = 1) => {
	const response = await fetch(`${API_BASE_URL}/client/cart/items`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify({ productId, quantity }),
	})

	return parseCartResponse(response)
}

export const updateCartItemQuantity = async (productId: string, quantity: number) => {
	const response = await fetch(`${API_BASE_URL}/client/cart/items/${encodeURIComponent(productId)}`, {
		method: 'PATCH',
		headers: getAuthHeaders(),
		body: JSON.stringify({ quantity }),
	})

	return parseCartResponse(response)
}

export const removeCartItem = async (productId: string) => {
	const response = await fetch(`${API_BASE_URL}/client/cart/items/${encodeURIComponent(productId)}`, {
		method: 'DELETE',
		headers: getAuthHeaders(),
	})

	return parseCartResponse(response)
}

export const clearCart = async () => {
	const response = await fetch(`${API_BASE_URL}/client/cart/clear`, {
		method: 'DELETE',
		headers: getAuthHeaders(),
	})

	return parseCartResponse(response)
}
