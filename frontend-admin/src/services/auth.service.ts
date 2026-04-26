import type { LoginCredentials, AdminUser, AuthResponse } from '../types/auth'
import { apiPost, apiGet } from '../utils/api.utils'

export type LoginPayload = LoginCredentials

const authService = {
  // Login — gọi admin auth endpoint
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    return await apiPost('/admin/auth/login', payload)
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await apiPost('/admin/auth/logout', {})
    } catch (error) {
      // Ignore logout errors, still clear localStorage
      console.error('Logout error:', error)
    }
  },

  // Refresh Token
  refreshToken: async (): Promise<AuthResponse> => {
    return await apiPost('/admin/auth/refresh', {})
  },

  // Get Current User
  getCurrentUser: async (): Promise<AdminUser> => {
    const data = await apiGet('/admin/auth/me')
    return data.data
  },

  // Forgot Password
  forgotPassword: async (email: string): Promise<{ maskedEmail: string; expiresInMinutes: number }> => {
    const data = await apiPost('/admin/auth/forgot-password', { email })
    return data.data
  },

  // Verify OTP
  verifyOTP: async (email: string, otp: string): Promise<{ token: string }> => {
    const data = await apiPost('/admin/auth/forgot-password/verify-otp', { email, otp })
    return data.data
  },

  // Reset Password
  resetPassword: async (email: string, newPassword: string, resetToken: string): Promise<void> => {
    await apiPost('/admin/auth/forgot-password/reset', { email, newPassword, resetToken })
  },
}

export default authService
