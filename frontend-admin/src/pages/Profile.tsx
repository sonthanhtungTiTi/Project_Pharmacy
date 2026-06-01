import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faShieldHalved, faCamera, faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import FaceCamera from '../components/ui/FaceCamera'
import { enrollFaceId, disableFaceId } from '../services/faceAuth.service'
import adminUserService from '../services/admin-user.service'

const toDateInputValue = (value?: string | null) => {
	if (!value) return ''
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
	const parsedDate = new Date(value)
	if (Number.isNaN(parsedDate.getTime())) return ''
	return parsedDate.toISOString().slice(0, 10)
}

export default function Profile() {
  const { user, setUser } = useAuthStore()
  
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [address, setAddress] = useState(user?.address || '')
  const [dateOfBirth, setDateOfBirth] = useState(toDateInputValue(user?.dateOfBirth))
  const [isSaving, setIsSaving] = useState(false)
  
  const [showFaceCamera, setShowFaceCamera] = useState(false)
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(Boolean(user?.faceIdEnabled))

  const handleSaveProfile = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const updated = await adminUserService.updateUser(user.id, {
        fullName,
        phone,
        address,
        dateOfBirth: dateOfBirth || null,
      })
      setUser({ ...user, ...updated })
      toast.success('Cập nhật thông tin thành công')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cập nhật thất bại')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleFaceId = async () => {
    if (!user) return
    if (isFaceIdEnabled) {
      try {
        await disableFaceId()
        setIsFaceIdEnabled(false)
        setUser({ ...user, faceIdEnabled: false })
        toast.success('Đã tắt đăng nhập bằng khuôn mặt')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Không thể tắt Face ID')
      }
    } else {
      setShowFaceCamera(true)
    }
  }

  const handleFaceCapture = async (faceDescriptors: number[][]) => {
    try {
      setShowFaceCamera(false)
      const loadingToast = toast.loading('Đang xử lý dữ liệu khuôn mặt...')
      await enrollFaceId(faceDescriptors)
      toast.dismiss(loadingToast)
      
      setIsFaceIdEnabled(true)
      if (user) {
        setUser({ ...user, faceIdEnabled: true })
      }
      toast.success('Đăng ký khuôn mặt thành công!')
    } catch (error) {
      toast.dismiss()
      toast.error(error instanceof Error ? error.message : 'Đăng ký khuôn mặt thất bại')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} className="text-blue-600" /> Thông tin cơ bản
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ (nơi ở hiện tại)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Nhập địa chỉ của bạn..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600" /> Bảo mật
            </h2>
            
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Đăng nhập Face ID</h3>
                  <p className="mt-1 text-xs text-gray-500">Sử dụng khuôn mặt để đăng nhập nhanh chóng và an toàn hơn.</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleFaceId}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isFaceIdEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                  role="switch"
                  aria-checked={isFaceIdEnabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isFaceIdEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
              
              {isFaceIdEnabled && (
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-green-600">
                  <FontAwesomeIcon icon={faCheckCircle} /> Đã thiết lập thành công
                </div>
              )}
              
              {!isFaceIdEnabled && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowFaceCamera(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    <FontAwesomeIcon icon={faCamera} /> Thiết lập ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFaceCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-base font-semibold text-gray-900 text-center">Đăng ký khuôn mặt</h3>
            </div>
            <div className="p-4">
              <FaceCamera
                mode="enroll"
                onCapture={handleFaceCapture}
              />
              <button
                type="button"
                onClick={() => setShowFaceCamera(false)}
                className="mt-4 w-full rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
