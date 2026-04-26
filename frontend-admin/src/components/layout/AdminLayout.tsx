import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faAnglesLeft,
  faAnglesRight,
  faBell,
  faCapsules,
  faChartLine,
  faChartPie,
  faFileInvoice,
  faGear,
  faPills,
  faRightFromBracket,
  faUsers,
  faWarehouse,
} from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../../stores/authStore'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('adminSidebarCollapsed') === 'true'
  })

  const avatarSrc = user?.avatarUrl || user?.avatar

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  const menuItems: Array<{ label: string; icon: IconDefinition; path: string }> = [
    { label: 'Dashboard', icon: faChartLine, path: '/dashboard' },
    { label: 'Đơn Hàng', icon: faFileInvoice, path: '/orders' },
    { label: 'Sản Phẩm', icon: faPills, path: '/products' },
    { label: 'Kho Hàng', icon: faWarehouse, path: '/inventory' },
    { label: 'Người Dùng', icon: faUsers, path: '/customers' },
    { label: 'Báo Cáo', icon: faChartPie, path: '/reports' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div
        className={`relative flex flex-col bg-white shadow-lg transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          className="absolute -right-3 top-4 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow transition hover:text-blue-600"
          aria-expanded={!isSidebarCollapsed}
          aria-label={isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          title={isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          <FontAwesomeIcon icon={isSidebarCollapsed ? faAnglesRight : faAnglesLeft} className="text-xs" />
        </button>

        {/* Logo */}
        <div
          className={`border-b transition-all duration-300 ${
            isSidebarCollapsed ? 'px-3 py-6' : 'px-6 py-8'
          }`}
        >
          <div
            className={`flex items-center font-bold text-xl text-blue-600 ${
              isSidebarCollapsed ? 'justify-center' : 'gap-2'
            }`}
          >
            <FontAwesomeIcon icon={faCapsules} className="text-lg" />
            {!isSidebarCollapsed && <span>Clinical Azure</span>}
          </div>
          {!isSidebarCollapsed && <p className="mt-1 text-xs text-gray-500">PHARMACY ADMIN</p>}
        </div>

        {/* Menu Items */}
        <nav className={`flex-1 space-y-2 py-6 transition-all duration-300 ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`group relative flex w-full items-center rounded-lg py-3 transition-all duration-300 ${
                isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4'
              } ${
                location.pathname === item.path
                  ? 'bg-blue-50 font-medium text-blue-700'
                  : 'text-gray-700 hover:bg-blue-50'
              }`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <FontAwesomeIcon icon={item.icon} className="w-5" />
              {!isSidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              {isSidebarCollapsed && (
                <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity duration-200 group-hover:opacity-100">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className={`border-t py-4 ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
          <button
            onClick={handleLogout}
            className={`group relative flex w-full items-center rounded-lg py-3 text-red-600 transition-all duration-300 hover:bg-red-50 ${
              isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4'
            }`}
            title={isSidebarCollapsed ? 'Logout' : undefined}
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-5" />
            {!isSidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
            {isSidebarCollapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity duration-200 group-hover:opacity-100">
                Logout
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="h-20 bg-white shadow-sm border-b flex items-center justify-between px-4 lg:px-8">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Tìm kiếm đơn hàng, khách hàng..."
              className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-6">
            {/* Notifications */}
            <button className="relative text-gray-500 hover:text-gray-700">
              <FontAwesomeIcon icon={faBell} className="text-lg" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Settings */}
            <button className="text-gray-500 hover:text-gray-700 text-xl">
              <FontAwesomeIcon icon={faGear} />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {(user?.email?.[0] || 'A').toUpperCase()}
                  </div>
                )}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Hồ sơ
                  </button>
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Cài đặt
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
