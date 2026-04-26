import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import type { LoginCredentials } from '../types/auth'

export const useAuth = () => {
  const { user, token, isAuthenticated, loading, error, login, logout, clearError } = useAuthStore()
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const handleLogin = async (credentials: LoginCredentials) => {
    // Validate
    const errors: Record<string, string> = {}
    
    if (!credentials.email) {
      errors.email = 'Email là bắt buộc'
    } else if (!credentials.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = 'Email không hợp lệ'
    }
    
    if (!credentials.password) {
      errors.password = 'Mật khẩu là bắt buộc'
    } else if (credentials.password.length < 6) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự'
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return false
    }

    setValidationErrors({})
    
    try {
      await login(credentials)
      return true
    } catch (error) {
      return false
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const clearFieldError = (field: string) => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }

  return {
    // State
    user,
    token,
    isAuthenticated,
    loading,
    error,
    validationErrors,

    // Actions
    login: handleLogin,
    logout: handleLogout,
    clearError,
    clearFieldError,
    setValidationErrors,
  }
}
