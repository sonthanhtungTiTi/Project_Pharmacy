import { create } from 'zustand'
import type { AdminUser, AuthState } from '../types/auth'
import authService from '../services/auth.service'
import type { LoginPayload } from '../services/auth.service'

interface AuthStoreState extends AuthState {
  login: (credentials: LoginPayload) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
  setUser: (user: AdminUser | null) => void
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthStoreState>((set) => {
  // Initialize from localStorage
  const savedToken = localStorage.getItem('adminAccessToken')
  const savedUser = localStorage.getItem('adminUser')

  let initialUser: AdminUser | null = null
  if (savedUser) {
    try {
      initialUser = JSON.parse(savedUser) as AdminUser
    } catch {
      // Keep app bootable even if stale storage contains invalid JSON.
      localStorage.removeItem('adminUser')
    }
  }

  return {
    // Initial State
    user: initialUser,
    token: savedToken || null,
    isAuthenticated: !!savedToken,
    // Keep protected pages from rendering until checkAuth completes.
    loading: true,
    error: null,

    // Actions
    login: async (credentials: LoginPayload) => {
      set({ loading: true, error: null })
      try {
        const response = await authService.login(credentials)
        
        if (!response.data) throw new Error('No data in response')

        const { accessToken, user } = response.data

        // Save to localStorage
        localStorage.setItem('adminAccessToken', accessToken)
        localStorage.setItem('adminUser', JSON.stringify(user))

        set({
          user,
          token: accessToken,
          isAuthenticated: true,
          loading: false,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Đăng nhập thất bại'
        set({
          error: errorMessage,
          loading: false,
        })
        throw error
      }
    },

    logout: async () => {
      set({ loading: true })
      try {
        await authService.logout()
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        // Always clear localStorage and state
        localStorage.removeItem('adminAccessToken')
        localStorage.removeItem('adminUser')

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
          error: null,
        })
      }
    },

    checkAuth: async () => {
      const token = localStorage.getItem('adminAccessToken')
      
      if (!token) {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
        })
        return
      }

      set({ loading: true })
      try {
        const user = await authService.getCurrentUser()
        set({
          user,
          token,
          isAuthenticated: true,
          loading: false,
        })
      } catch (error) {
        // Token invalid or expired
        localStorage.removeItem('adminAccessToken')
        localStorage.removeItem('adminUser')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
          error: 'Phiên hết hạn, vui lòng đăng nhập lại',
        })
      }
    },

    clearError: () => {
      set({ error: null })
    },

    setUser: (user: AdminUser | null) => {
      set({ user })
    },

    setToken: (token: string | null) => {
      set({ token })
    },
  }
})
