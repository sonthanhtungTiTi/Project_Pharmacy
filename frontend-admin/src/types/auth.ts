export interface LoginCredentials {
  email: string
  password: string
}

export interface AdminUser {
  id: string
  email: string
  fullName: string
  role: 'customer' | 'pharmacist' | 'warehouse_staff' | 'sales_staff' | 'manager' | 'admin' | 'banned'
  avatar?: string
  avatarUrl?: string
  phone?: string
  department?: string | null
  permissions: string[]
  createdAt: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data?: {
    accessToken: string
    refreshToken?: string
    user: AdminUser
    expiresIn: number
  }
  error?: string
}

export interface AuthState {
  user: AdminUser | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}
