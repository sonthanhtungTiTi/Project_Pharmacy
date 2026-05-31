const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

const getAccessToken = () => localStorage.getItem('clientAccessToken') || ''

const getAuthHeaders = () => {
	const accessToken = getAccessToken()
	if (!accessToken) {
		throw new Error('Vui lòng đăng nhập lại để thực hiện tính năng này')
	}
	return {
		Authorization: `Bearer ${accessToken}`,
	}
}

/**
 * Đăng ký Face ID (Enroll)
 * Gửi 3 vector đặc trưng khuôn mặt (straight, left, right) dưới dạng JSON
 */
export const enrollFaceId = async (descriptors: number[][]) => {
	const response = await fetch(`${API_BASE_URL}/client/auth/face/enroll`, {
		method: 'POST',
		headers: {
			...getAuthHeaders(),
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ faceDescriptors: descriptors }),
	})

	const payload = await response.json()
	if (!response.ok || !payload.success) {
		throw new Error(payload.message || payload.error || 'Đăng ký Face ID thất bại')
	}

	return payload
}

/**
 * Tắt tính năng Face ID
 */
export const disableFaceId = async () => {
	const response = await fetch(`${API_BASE_URL}/client/auth/face/disable`, {
		method: 'POST',
		headers: {
			...getAuthHeaders(),
			'Content-Type': 'application/json',
		},
	})

	const payload = await response.json()
	if (!response.ok || !payload.success) {
		throw new Error(payload.message || payload.error || 'Tắt Face ID thất bại')
	}

	return payload
}

/**
 * Đăng nhập bằng Face ID
 * Gửi 3 vector (thẳng, trái, phải) dưới dạng JSON để backend kiểm tra chống giả mạo
 */
export const loginWithFaceId = async (descriptors: number[][]) => {
	const response = await fetch(`${API_BASE_URL}/client/auth/face/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ faceDescriptors: descriptors }),
	})

	const payload = await response.json()
	if (!response.ok || !payload.success) {
		throw new Error(payload.message || payload.error || 'Đăng nhập Face ID thất bại')
	}

	return payload.data
}
