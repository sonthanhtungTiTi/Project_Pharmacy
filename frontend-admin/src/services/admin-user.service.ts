import { apiGet, apiPost, apiPatch } from '../utils/api.utils'

// ============== Types ==============
export type UserRole = 'customer' | 'pharmacist' | 'warehouse_staff' | 'sales_staff' | 'manager' | 'admin' | 'banned'
export type Department = 'warehouse' | 'sales' | 'pharmacy' | 'management' | null

export interface AdminUserItem {
  id: string
  fullName: string
  email: string
  phone: string
  avatar: string
  role: UserRole
  department: Department
  provider: string
  isActive: boolean
  address: string
  dateOfBirth: string | null
  lastLoginAt: string
  createdAt: string
  updatedAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UserListResponse {
  items: AdminUserItem[]
  pagination: Pagination
}

export interface UserQueryParams {
  page?: number
  limit?: number
  search?: string
  role?: UserRole
  status?: 'active' | 'inactive' | 'all'
}

export interface UserStats {
  total: number
  active: number
  inactive: number
  byRole: Record<string, number>
}

export interface CreateUserData {
  fullName: string
  email: string
  phone?: string
  password: string
  role?: UserRole
  department?: Department
}

// ============== Service ==============
const adminUserService = {
  // Danh sách users
  getUsers: async (params: UserQueryParams = {}): Promise<UserListResponse> => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.search) query.set('search', params.search)
    if (params.role) query.set('role', params.role)
    if (params.status) query.set('status', params.status)

    const data = await apiGet(`/admin/users?${query}`)
    return data.data
  },

  // Chi tiết user
  getUserById: async (userId: string): Promise<AdminUserItem> => {
    const data = await apiGet(`/admin/users/${userId}`)
    return data.data
  },

  // Thống kê
  getUserStats: async (): Promise<UserStats> => {
    const data = await apiGet('/admin/users/stats')
    return data.data
  },

  // Tạo user
  createUser: async (userData: CreateUserData): Promise<AdminUserItem> => {
    const data = await apiPost('/admin/users', userData)
    return data.data
  },

  // Cập nhật user
  updateUser: async (userId: string, userData: Partial<AdminUserItem>): Promise<AdminUserItem> => {
    const data = await apiPatch(`/admin/users/${userId}`, userData)
    return data.data
  },

  // Đổi role
  updateUserRole: async (userId: string, role: UserRole, department?: Department): Promise<AdminUserItem> => {
    const data = await apiPatch(`/admin/users/${userId}/role`, { role, department })
    return data.data
  },

  // Ban user
  banUser: async (userId: string): Promise<AdminUserItem> => {
    const data = await apiPatch(`/admin/users/${userId}/ban`, {})
    return data.data
  },

  // Unban user
  unbanUser: async (userId: string): Promise<AdminUserItem> => {
    const data = await apiPatch(`/admin/users/${userId}/unban`, {})
    return data.data
  },
}

export default adminUserService
