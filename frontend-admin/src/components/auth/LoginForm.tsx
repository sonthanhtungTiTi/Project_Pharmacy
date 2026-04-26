import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'

export default function LoginForm() {
  const navigate = useNavigate()
  const { login, loading, error, validationErrors, clearFieldError } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error on change
    if (validationErrors[name]) {
      clearFieldError(name)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const success = await login(formData)
    if (success) {
      navigate('/dashboard')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
          HỆ THỐNG QUẢN TRỊ
        </p>
        <h1 className="mb-1 text-3xl font-bold text-gray-900">Đăng nhập Admin</h1>
        <p className="text-sm text-gray-600">Nhà thuốc Azure Pharmacy Management</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Email Field */}
      <div className="mb-5">
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
          TÊN ĐĂNG NHẬP / EMAIL
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={() => {
            // Validate on blur
            if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
              // Error already shown in real-time
            }
          }}
          placeholder="admin@clinicazure.com"
          className={`w-full rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 ${
            validationErrors.email
              ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200'
          }`}
        />
        {validationErrors.email && (
          <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.email}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            MẬT KHẨU
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className={`w-full rounded-lg border px-4 py-3 pr-12 text-sm transition-all focus:outline-none focus:ring-2 ${
              validationErrors.password
                ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
            aria-label="Toggle password visibility"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m7.538-1.894a3.375 3.375 0 001.946-1.946m-5.875 12.622a10.053 10.053 0 01-4.891-1.238m15.356-9.474a9.967 9.967 0 00-1.564-4.803c1.42-1.084 2.82-2.201 4.191-3.352M9 20.854c-.576.425-1.244.82-1.993 1.178M16.573 3.101a9.969 9.969 0 015.301 7.422" />
              </svg>
            )}
          </button>
        </div>
        {validationErrors.password && (
          <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.password}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 py-3 text-sm font-semibold text-white transition-colors mb-6 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang xử lý...
          </>
        ) : (
          <>
            TIẾP TỤC ĐĂNG NHẬP
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        )}
      </button>

      {/* Support Section */}
      <div className="text-center">
        <p className="text-xs text-gray-600 mb-1">Bạn gặp sự cố khi đăng nhập?</p>
        <Link to="/support" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition">
          Liên hệ Bộ phận kỹ thuật Hỗ trợ
        </Link>
      </div>
    </form>
  )
}
