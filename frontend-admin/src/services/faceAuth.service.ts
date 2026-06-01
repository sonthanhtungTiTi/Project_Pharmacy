const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

const getAccessToken = () => localStorage.getItem('adminAccessToken') || ''

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
 * Cần gửi JWT Token và mảng faceDescriptors
 */
export const enrollFaceId = async (faceDescriptors: number[][]) => {
	const response = await fetch(`${API_BASE_URL}/admin/auth/face/enroll`, {
		method: 'POST',
		headers: {
			...getAuthHeaders(),
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ faceDescriptors }),
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
	const response = await fetch(`${API_BASE_URL}/admin/auth/face/disable`, {
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
 * Gửi 3 mảng faceDescriptors (thẳng, trái, phải) để backend kiểm tra chống giả mạo ảnh tĩnh
 */
export const loginWithFaceId = async (faceDescriptors: number[][]) => {
	const response = await fetch(`${API_BASE_URL}/admin/auth/face/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ faceDescriptors }),
	})

	const payload = await response.json()
	if (!response.ok || !payload.success) {
		throw new Error(payload.message || payload.error || 'Đăng nhập Face ID thất bại')
	}

	return payload.data
}
