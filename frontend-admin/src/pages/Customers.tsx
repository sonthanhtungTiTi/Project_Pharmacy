import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBan,
  faCheck,
  faChevronLeft,
  faChevronRight,
  faKey,
  faMagnifyingGlass,
  faPhone,
  faUserPlus,
  faUsers,
  faVideo,
} from '@fortawesome/free-solid-svg-icons'
import adminUserService from '../services/admin-user.service'
import type { AdminUserItem, UserRole, UserQueryParams, UserStats, CreateUserData } from '../services/admin-user.service'
import type { Pagination } from '../services/admin-product.service'

const ROLE_LABELS: Record<string, string> = {
  customer: 'Khách hàng',
  pharmacist: 'Dược sĩ',
  warehouse_staff: 'NV Kho',
  sales_staff: 'NV Bán hàng',
  manager: 'Quản lý',
  admin: 'Admin',
  banned: 'Bị cấm',
}

const ROLE_COLORS: Record<string, string> = {
  customer: 'bg-gray-100 text-gray-700',
  pharmacist: 'bg-teal-100 text-teal-700',
  warehouse_staff: 'bg-amber-100 text-amber-700',
  sales_staff: 'bg-blue-100 text-blue-700',
  manager: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  banned: 'bg-red-200 text-red-800',
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadUsers()
    loadStats()
  }, [currentPage, roleFilter, statusFilter])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: UserQueryParams = {
        page: currentPage,
        limit: 15,
        status: statusFilter,
      }
      if (search.trim()) params.search = search.trim()
      if (roleFilter) params.role = roleFilter as UserRole

      const data = await adminUserService.getUsers(params)
      setUsers(data.items)
      setPagination(data.pagination)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await adminUserService.getUserStats()
      setStats(data)
    } catch { /* ignore */ }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadUsers()
  }

  const handleBanUser = async (user: AdminUserItem) => {
    if (!confirm(`Bạn có chắc muốn vô hiệu hóa tài khoản "${user.fullName}"?`)) return
    setActionLoading(true)
    try {
      await adminUserService.banUser(user.id)
      loadUsers()
      loadStats()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnbanUser = async (user: AdminUserItem) => {
    setActionLoading(true)
    try {
      await adminUserService.unbanUser(user.id)
      loadUsers()
      loadStats()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    setActionLoading(true)
    try {
      await adminUserService.updateUserRole(userId, newRole)
      setShowRoleModal(false)
      setSelectedUser(null)
      loadUsers()
      loadStats()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FontAwesomeIcon icon={faUsers} className="text-blue-600" />
            Quản Lý Người Dùng
          </h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý tài khoản, phân quyền và trạng thái người dùng</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faUserPlus} /> Tạo Tài Khoản
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Tổng cộng</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-xs text-gray-500">Hoạt động</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
            <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
            <p className="text-xs text-gray-500">Bị khóa</p>
          </div>
          {Object.entries(stats.byRole).slice(0, 3).map(([role, count]) => (
            <div key={role} className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-blue-600">{count}</p>
              <p className="text-xs text-gray-500">{ROLE_LABELS[role] || role}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Tìm theo tên, email, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as UserRole); setCurrentPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả vai trò</option>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Bị khóa</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="mr-2" />
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2"><FontAwesomeIcon icon={faUsers} /></p>
            <p>Không tìm thấy người dùng nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">NGƯỜI DÙNG</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">LIÊN HỆ</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">VAI TRÒ</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">TRẠNG THÁI</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">NGÀY TẠO</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 text-xs">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{user.fullName}</p>
                          <p className="text-xs text-gray-400">{user.provider}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-700 text-xs">{user.email}</p>
                      <p className="text-gray-500 text-xs">{user.phone || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[user.role] || 'bg-gray-100'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.isActive ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            // Dispatch custom event to trigger call from CallProvider
                            window.dispatchEvent(new CustomEvent('admin:initiate-call', {
                              detail: { peerId: user.id, peerName: user.fullName, callType: 'video' }
                            }))
                          }}
                          className="px-2 py-1 text-xs bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition"
                          title="Gọi Video"
                        >
                          <FontAwesomeIcon icon={faVideo} />
                        </button>
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('admin:initiate-call', {
                              detail: { peerId: user.id, peerName: user.fullName, callType: 'voice' }
                            }))
                          }}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                          title="Gọi Thoại"
                        >
                          <FontAwesomeIcon icon={faPhone} />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(user); setShowRoleModal(true) }}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                          title="Đổi vai trò"
                        >
                          <FontAwesomeIcon icon={faKey} />
                        </button>
                        {user.isActive && user.role !== 'admin' ? (
                          <button
                            onClick={() => handleBanUser(user)}
                            disabled={actionLoading}
                            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                            title="Vô hiệu hóa"
                          >
                            <FontAwesomeIcon icon={faBan} />
                          </button>
                        ) : !user.isActive ? (
                          <button
                            onClick={() => handleUnbanUser(user)}
                            disabled={actionLoading}
                            className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 transition"
                            title="Khôi phục"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Trang {pagination.page} / {pagination.totalPages} ({pagination.total} người dùng)
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs border rounded hover:bg-white disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-xs border rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'hover:bg-white'}`}
                  >
                    {page}
                  </button>
                )
              })}
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="px-3 py-1 text-xs border rounded hover:bg-white disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowRoleModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faKey} className="text-blue-600" />
              Đổi Vai Trò
            </h3>
            <p className="text-sm text-gray-600 mb-4">Người dùng: <strong>{selectedUser.fullName}</strong></p>
            <div className="space-y-2">
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <button
                  key={role}
                  onClick={() => handleChangeRole(selectedUser.id, role as UserRole)}
                  disabled={actionLoading || role === selectedUser.role}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition text-sm ${
                    role === selectedUser.role
                      ? 'bg-blue-50 border-blue-300 font-medium'
                      : 'hover:bg-gray-50 border-gray-200'
                  } disabled:opacity-50`}
                >
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mr-2 ${ROLE_COLORS[role]}`}>
                    {label}
                  </span>
                  {role === selectedUser.role && <span className="text-xs text-blue-600">(hiện tại)</span>}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRoleModal(false)}
              className="w-full mt-4 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadUsers(); loadStats() }}
        />
      )}
    </div>
  )
}

// ============== Create User Modal ==============
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateUserData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.email || !form.password) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }
    setLoading(true)
    setError('')
    try {
      await adminUserService.createUser(form)
      onCreated()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faUserPlus} className="text-blue-600" />
          Tạo Tài Khoản Mới
        </h3>
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
            <input type="text" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="0912345678" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu *</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'banned').map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
