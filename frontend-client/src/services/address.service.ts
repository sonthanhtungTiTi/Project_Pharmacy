const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export interface AddressItem {
	id: string
	userId: string
	label: 'home' | 'office' | 'other'
	recipientName: string
	phone: string
	provinceCode: string
	provinceName: string
	districtCode: string
	districtName: string
	wardCode: string
	wardName: string
	street: string
	note: string
	isDefault: boolean
	fullAddress: string
	createdAt: string
	updatedAt: string
}

export interface AddressPayload {
	label?: 'home' | 'office' | 'other'
	recipientName: string
	phone: string
	provinceCode?: string
	provinceName: string
	districtCode?: string
	districtName: string
	wardCode?: string
	wardName: string
	street: string
	note?: string
	isDefault?: boolean
}

interface AddressResponse<TData> {
	success: boolean
	message: string
	data?: TData
	error?: string
}

const getAccessToken = () => localStorage.getItem('clientAccessToken') || ''

const getAuthHeaders = () => {
	const accessToken = getAccessToken()

	if (!accessToken) {
		throw new Error('Vui long dang nhap de quan ly dia chi')
	}

	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${accessToken}`,
	}
}

const parseResponse = async <TData>(response: Response): Promise<TData> => {
	const payload = (await response.json()) as AddressResponse<TData>

	if (!response.ok || !payload.success) {
		throw new Error(payload.message || payload.error || 'Address request failed')
	}

	return payload.data as TData
}

export const getMyAddresses = async () => {
	const response = await fetch(`${API_BASE_URL}/client/addresses`, {
		method: 'GET',
		headers: getAuthHeaders(),
	})

	return parseResponse<AddressItem[]>(response)
}

export const getMyDefaultAddress = async () => {
	const response = await fetch(`${API_BASE_URL}/client/addresses/default`, {
		method: 'GET',
		headers: getAuthHeaders(),
	})

	return parseResponse<AddressItem | null>(response)
}

export const createMyAddress = async (addressPayload: AddressPayload) => {
	const response = await fetch(`${API_BASE_URL}/client/addresses`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(addressPayload),
	})

	return parseResponse<AddressItem>(response)
}

export const updateMyAddress = async (addressId: string, addressPayload: Partial<AddressPayload>) => {
	const response = await fetch(`${API_BASE_URL}/client/addresses/${encodeURIComponent(addressId)}`, {
		method: 'PATCH',
		headers: getAuthHeaders(),
		body: JSON.stringify(addressPayload),
	})

	return parseResponse<AddressItem>(response)
}

export const setMyDefaultAddress = async (addressId: string) => {
	const response = await fetch(`${API_BASE_URL}/client/addresses/${encodeURIComponent(addressId)}/default`, {
		method: 'PATCH',
		headers: getAuthHeaders(),
	})

	return parseResponse<AddressItem>(response)
}

export const deleteMyAddress = async (addressId: string) => {
	const response = await fetch(`${API_BASE_URL}/client/addresses/${encodeURIComponent(addressId)}`, {
		method: 'DELETE',
		headers: getAuthHeaders(),
	})

	return parseResponse<{ deleted: boolean }>(response)
}
