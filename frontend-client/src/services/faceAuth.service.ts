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
 * Cần gửi JWT Token và 1 file ảnh (Blob)
 */
export const enrollFaceId = async (imageBlobs: Blob[]) => {
	const formData = new FormData()
	imageBlobs.forEach((blob, index) => {
		formData.append('faceImages', blob, `face_${index}.jpg`)
	})

	const response = await fetch(`${API_BASE_URL}/client/auth/face/enroll`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: formData,
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
 * Gửi 3 ảnh (thẳng, trái, phải) để backend kiểm tra chống giả mạo ảnh tĩnh
 */
export const loginWithFaceId = async (email: string, imageBlobs: Blob[]) => {
	const formData = new FormData()
	formData.append('email', email)
	imageBlobs.forEach((blob, index) => {
		formData.append('faceImages', blob, `face_login_${index}.jpg`)
	})

	const response = await fetch(`${API_BASE_URL}/client/auth/face/login`, {
		method: 'POST',
		body: formData,
	})

	const payload = await response.json()
	if (!response.ok || !payload.success) {
		throw new Error(payload.message || payload.error || 'Đăng nhập Face ID thất bại')
	}

	return payload.data
}
