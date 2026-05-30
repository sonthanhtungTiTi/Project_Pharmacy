export interface AuthUser {
	id: string
	fullName: string
	email: string
	phone?: string
	avatar: string
	address?: string
	dateOfBirth?: string
	role: string
	provider: string
}

interface AuthResponse {
	success: boolean
	message: string
	data?: {
		accessToken: string
		user: AuthUser
	}
	error?: string
}

interface ProfileUpdateResponse {
	success: boolean
	message: string
	data?: {
		user: AuthUser
	}
	error?: string
}

interface RegisterPayload {
	fullName: string
	email: string
	phone: string
	password: string
}

interface LoginPayload {
	phoneOrEmail: string
	password: string
}

interface ForgotPasswordPayload {
	email: string
}

interface ForgotPasswordResponse {
	success: boolean
	message: string
	data?: {
		maskedEmail: string
		expiresInMinutes: number
	}
	error?: string
}

interface VerifyForgotPasswordOtpPayload {
	email: string
	otp: string
}

interface VerifyForgotPasswordOtpResponse {
	success: boolean
	message: string
	data?: {
		verified: boolean
	}
	error?: string
}

interface ResetForgotPasswordPayload {
	email: string
	newPassword: string
	confirmPassword: string
}

interface ResetForgotPasswordResponse {
	success: boolean
	message: string
	data?: {
		reset: boolean
	}
	error?: string
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

const getAccessToken = () => localStorage.getItem('clientAccessToken') || ''

const getAuthHeaders = () => {
	const accessToken = getAccessToken()

	if (!accessToken) {
		throw new Error('Vui lòng đăng nhập lại để cập nhật thông tin')
	}

	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${accessToken}`,
	}
}

export const loginWithGoogle = async (idToken: string) => {
	const response = await fetch(`${API_BASE_URL}/client/auth/google`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ idToken }),
	})

	const payload = (await response.json()) as AuthResponse

	if (!response.ok || !payload.success || !payload.data) {
		throw new Error(payload.message || payload.error || 'Google login failed')
	}

	return payload.data
}

export const loginWithGoogleCode = async (authCode: string, redirectUri: string) => {
	const response = await fetch(`${API_BASE_URL}/client/auth/google/code`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ authCode, redirectUri }),
	})

	const payload = (await response.json()) as AuthResponse

	if (!response.ok || !payload.success || !payload.data) {
		throw new Error(payload.message || payload.error || 'Google login failed')
	}

	return payload.data
}

export const registerWithForm = async (registerPayload: RegisterPayload) => {
	const response = await fetch(`${API_BASE_URL}/client/auth/register`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(registerPayload),
	})

	const payload = (await response.json()) as AuthResponse

	if (!response.ok || !payload.success || !payload.data) {
		throw new Error(payload.message || payload.error || 'Register failed')
	}

	return payload.data
}

export const loginWithForm = async (loginPayload: LoginPayload) => {
	const response = await fetch(`${API_BASE_URL}/client/auth/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(loginPayload),
	})

	const payload = (await response.json()) as AuthResponse

	if (!response.ok || !payload.success || !payload.data) {
		throw new Error(payload.message || payload.error || 'Login failed')
	}

	return payload.data
}

export const updateProfile = async (userId: string, profilePayload: Partial<AuthUser>) => {
	const response = await fetch(`${API_BASE_URL}/client/auth/profile/${userId}`, {
		method: 'PUT',
		headers: getAuthHeaders(),
		body: JSON.stringify(profilePayload),
	})

	const payload = (await response.json()) as ProfileUpdateResponse

	if (!response.ok || !payload.success || !payload.data?.user) {
		throw new Error(payload.message || payload.error || 'Update profile failed')
	}

	return payload.data.user
}

export const forgotPassword = async (forgotPasswordPayload: ForgotPasswordPayload) => {
	const response = await fetch(`${API_BASE_URL}/client/auth/forgot-password`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(forgotPasswordPayload),
	})

	const payload = (await response.json()) as ForgotPasswordResponse

	if (!response.ok || !payload.success || !payload.data) {
		throw new Error(payload.message || payload.error || 'Forgot password failed')
	}

	return payload.data
}

export const verifyForgotPasswordOtp = async (verifyPayload: VerifyForgotPasswordOtpPayload) => {
	const response = await fetch(`${API_BASE_URL}/client/auth/forgot-password/verify-otp`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(verifyPayload),
	})

	const payload = (await response.json()) as VerifyForgotPasswordOtpResponse

	if (!response.ok || !payload.success || !payload.data?.verified) {
		throw new Error(payload.message || payload.error || 'Verify OTP failed')
	}

	return payload.data
}

export const resetForgotPassword = async (resetPayload: ResetForgotPasswordPayload) => {
	const response = await fetch(`${API_BASE_URL}/client/auth/forgot-password/reset`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(resetPayload),
	})

	const payload = (await response.json()) as ResetForgotPasswordResponse

	if (!response.ok || !payload.success || !payload.data?.reset) {
		throw new Error(payload.message || payload.error || 'Reset password failed')
	}

	return payload.data
}
