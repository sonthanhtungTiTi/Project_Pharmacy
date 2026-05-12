import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowRight,
  faBoxOpen,
  faImage,
  faMagnifyingGlass,
  faPen,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import productService, { type Product } from '../../services/product.service'
import MedicineForm from './MedicineForm'

interface MedicineListProps {
  categoryId: string
  categoryName: string
}

const twoLineClampStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

const threeLineClampStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

const getMedicineId = (medicine: Product) => medicine.id || medicine._id || ''

const getTotalStock = (medicine: Product) => {
  if (typeof medicine.totalStock === 'number') {
    return medicine.totalStock
  }

  return (medicine.inventory || []).reduce((sum, batch) => sum + (batch.quantity || 0), 0)
}

const formatPrice = (value: number | string | undefined) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(numeric)
  }

  return value ? String(value) : '-'
}

const getBackendUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  return apiUrl.replace(/\/api\/?$/, '')
}

const cleanProxyUrl = (url: string) => {
  if (!url) return ''
  
  // Detect complex proxy URLs like https://img.tgdd.vn/imgt/ankhang/.../https://cdnv2.tgdd.vn/...
  // We want to extract the second part which is the real image URL
  const doubleHttpsIndex = url.lastIndexOf('https://')
  if (doubleHttpsIndex > 0) {
    return url.substring(doubleHttpsIndex)
  }
  
  const doubleHttpIndex = url.lastIndexOf('http://')
  if (doubleHttpIndex > 0) {
    return url.substring(doubleHttpIndex)
  }

  return url
}

const extractAllImages = (rawImage: Product['images']): string[] => {
  if (!rawImage) return []

  let urls: string[] = []

  if (Array.isArray(rawImage)) {
    urls = rawImage.filter((img) => typeof img === 'string' && img.trim())
  } else if (typeof rawImage === 'string') {
    const trimmed = rawImage.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          urls = parsed.filter((img) => typeof img === 'string' && img.trim())
        }
      } catch {
        urls = [trimmed]
      }
    } else {
      // Split by common separators, but prioritize ';' to avoid breaking URLs with commas
      let parts: string[] = []
      if (trimmed.includes(';')) {
        parts = trimmed.split(';').map((s) => s.trim())
      } else if (trimmed.includes('|')) {
        parts = trimmed.split('|').map((s) => s.trim())
      } else if (trimmed.includes(',')) {
        // Only split by comma if it doesn't look like part of a TGDD proxy URL (f_webp,fit_outside,...)
        if (!trimmed.includes('f_webp,') && !trimmed.includes('quality_')) {
          parts = trimmed.split(',').map((s) => s.trim())
        } else {
          parts = [trimmed]
        }
      } else {
        parts = [trimmed]
      }
      urls = parts.filter(Boolean)
    }
  }

  return urls.map((url) => {
    const cleaned = cleanProxyUrl(url)
    if (cleaned.startsWith('/') && !cleaned.startsWith('//')) {
      return `${getBackendUrl()}${cleaned}`
    }
    return cleaned
  })
}

const normalizeProductImage = (rawImage: Product['images']) => {
  const all = extractAllImages(rawImage)
  return all.length > 0 ? all[0] : ''
}

export default function MedicineList({ categoryId, categoryName }: MedicineListProps) {
  const [medicines, setMedicines] = useState<Product[]>([])
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<Product | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [lightboxData, setLightboxData] = useState<{ images: string[]; index: number } | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  const showToast = (message: string) => {
    setToastMessage(message)
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null)
    }, 2500)
  }

  useEffect(() => {
    console.log('📌 MedicineList useEffect - categoryId:', categoryId)
    fetchMedicines()
  }, [categoryId, page])

  const fetchMedicines = async () => {
    console.log('🔄 Đang fetch sản phẩm:', { categoryId, page, searchTerm })
    setLoading(true)
    setError(null)
    setImageErrorMap({})
    try {
      const filters: Record<string, string> = {
        categoryId,
      }

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim()
      }

      const response = await productService.getProducts(page, 20, {
        ...filters,
      })
      console.log('✅ Response từ API:', response)
      console.log('📦 Sản phẩm nhận được:', response.data.items)
      setMedicines(response.data.items)
      setTotalPages(response.data.totalPages)
    } catch (err) {
      console.error('❌ Lỗi fetch sản phẩm:', err)
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMedicine = () => {
    setEditingMedicine(undefined)
    setShowForm(true)
  }

  const handleEditMedicine = (medicine: Product) => {
    setEditingMedicine(medicine)
    setShowForm(true)
  }

  const handleDeleteMedicine = async (medicineId: string) => {
    setDeleteConfirm(null)
    try {
      await productService.deleteProduct(medicineId)
      setMedicines((prev) => prev.filter((item) => getMedicineId(item) !== medicineId))
      showToast('Xóa thuốc thành công')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xóa thuốc')
    }
  }

  const handleFormSaved = (savedMedicine: Product, mode: 'create' | 'update') => {
    const editingId = editingMedicine ? getMedicineId(editingMedicine) : ''
    setShowForm(false)
    setEditingMedicine(undefined)

    if (mode === 'update') {
      const savedId = getMedicineId(savedMedicine) || editingId

      setMedicines((prev) =>
        prev.map((item) => {
          if (getMedicineId(item) !== savedId && getMedicineId(item) !== editingId) {
            return item
          }

          return {
            ...item,
            ...savedMedicine,
            id: savedMedicine.id || savedMedicine._id || item.id || item._id,
            _id: savedMedicine._id || savedMedicine.id || item._id || item.id,
          }
        }),
      )
      showToast('Cập nhật thành công')
      return
    }

    setPage(1)
    fetchMedicines()
    showToast('Thêm thuốc thành công')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchMedicines()
  }

  return (
    <div className="flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FontAwesomeIcon icon={faBoxOpen} className="text-blue-600" />
            {categoryName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Quản lý sản phẩm trong danh mục này</p>
        </div>
        <button
          onClick={handleAddMedicine}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Thêm Thuốc
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Tìm kiếm tên hoặc mã thuốc..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition font-medium"
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </button>
      </form>

      {/* Medicines Table */}
      <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block mb-4">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : medicines.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">Không có thuốc nào trong danh mục này</p>
            <button
              onClick={handleAddMedicine}
              className="text-blue-600 hover:underline font-medium"
            >
              Thêm thuốc đầu tiên →
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] table-fixed text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="w-40 px-4 py-4 text-left font-semibold">Mã thuốc</th>
                    <th className="min-w-[420px] w-[34%] px-4 py-4 text-left font-semibold">Ảnh & Tên</th>
                    <th className="w-[36%] px-4 py-4 text-left font-semibold">Thành phần</th>
                    <th className="w-36 px-4 py-4 text-right font-semibold">Giá</th>
                    <th className="w-36 px-4 py-4 text-center font-semibold">Tồn kho</th>
                    <th className="sticky right-0 z-20 w-32 bg-gray-50 px-4 py-4 text-center font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {medicines.map((medicine) => {
                    const medicineId = getMedicineId(medicine)
                    const imageStateKey = medicineId || medicine.medicineCode || medicine.productName || 'unknown-image'
                    const imageSrc = normalizeProductImage(medicine.images)
                    const hasImage = Boolean(imageSrc) && !imageErrorMap[imageStateKey]
                    const totalStock = getTotalStock(medicine)

                    return (
                      <tr 
                        key={medicineId || medicine.medicineCode} 
                        className="group hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleEditMedicine(medicine)}
                      >
                        <td className="px-4 py-5 align-top">
                          <span className="rounded bg-gray-100 px-2.5 py-1.5 font-mono text-xs text-gray-700">
                            {medicine.medicineCode || '-'}
                          </span>
                        </td>

                        <td className="min-w-[420px] px-4 py-5">
                          <div className="flex items-start gap-4">
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                              {hasImage ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const allImages = extractAllImages(medicine.images)
                                    setLightboxData({ images: allImages, index: 0 })
                                  }}
                                  className="h-full w-full overflow-hidden focus:outline-none"
                                  title="Nhấn để xem bộ ảnh"
                                >
                                  <img
                                    src={imageSrc}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover transition hover:scale-110"
                                    onError={() => {
                                      setImageErrorMap((prev) => ({
                                        ...prev,
                                        [imageStateKey]: true,
                                      }))
                                    }}
                                  />
                                </button>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-300">
                                  <FontAwesomeIcon icon={faImage} className="text-2xl" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 pt-1">
                              <p className="text-lg font-bold leading-snug text-gray-900" style={twoLineClampStyle}>
                                {medicine.productName || '-'}
                              </p>
                              <p className="mt-2 text-sm text-gray-500" style={twoLineClampStyle}>
                                {medicine.usageSummary || medicine.brand || 'Không có mô tả ngắn'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-5 align-top">
                          <p className="text-sm leading-relaxed text-gray-700" style={threeLineClampStyle}>
                            {medicine.mainIngredients || medicine.ingredients || '-'}
                          </p>
                        </td>

                        <td className="px-4 py-5 text-right text-base font-semibold text-gray-900">
                          {formatPrice(medicine.price)}
                        </td>

                        <td className="px-4 py-5 text-center">
                          <span
                            className={`inline-flex min-w-16 justify-center rounded-full px-3 py-1.5 text-sm font-semibold ${
                              totalStock === 0
                                ? 'bg-red-100 text-red-700'
                                : totalStock <= 10
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {totalStock}
                          </span>
                        </td>

                        <td className="sticky right-0 z-10 bg-white/95 px-4 py-5 backdrop-blur-sm group-hover:bg-slate-50">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditMedicine(medicine)
                              }}
                              className="rounded bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
                              title="Sửa"
                            >
                              <FontAwesomeIcon icon={faPen} className="mr-1" />
                              Sửa
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConfirm(medicineId)
                              }}
                              disabled={!medicineId}
                              className="rounded bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Xóa"
                            >
                              <FontAwesomeIcon icon={faTrash} className="mr-1" />
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                  Trước
                </button>
                <span className="px-4 py-1 text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Tiếp <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Forms & Dialogs */}
      {showForm && editingMedicine === undefined && (
        <MedicineForm
          categoryId={categoryId}
          categoryName={categoryName}
          onSaved={handleFormSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showForm && editingMedicine && (
        <MedicineForm
          medicine={editingMedicine}
          categoryId={categoryId}
          categoryName={categoryName}
          onSaved={handleFormSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      {toastMessage && (
        <div className="fixed right-6 top-6 z-[60] rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Xóa Thuốc?</h3>
            <p className="text-gray-600 mb-6">
              Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa thuốc này không?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteMedicine(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxData && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4 transition-all"
          onClick={() => setLightboxData(null)}
        >
          {/* Main Image */}
          <div className="relative flex max-h-[80vh] items-center justify-center">
            <img 
              src={lightboxData.images[lightboxData.index]} 
              alt="Preview" 
              className="max-h-full max-w-full rounded-lg shadow-2xl transition-all duration-300"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Close Button */}
            <button
              onClick={() => setLightboxData(null)}
              className="absolute -right-4 -top-12 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <span className="text-3xl">&times;</span>
            </button>

            {/* Navigation Arrows */}
            {lightboxData.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxData(prev => prev ? {
                      ...prev,
                      index: (prev.index - 1 + prev.images.length) % prev.images.length
                    } : null)
                  }}
                  className="absolute -left-16 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxData(prev => prev ? {
                      ...prev,
                      index: (prev.index + 1) % prev.images.length
                    } : null)
                  }}
                  className="absolute -right-16 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <FontAwesomeIcon icon={faArrowRight} className="text-xl" />
                </button>
              </>
            )}
          </div>

          {/* Indicators & Info */}
          {lightboxData.images.length > 1 && (
            <div className="mt-8 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
              <div className="flex gap-2">
                {lightboxData.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxData(prev => prev ? { ...prev, index: i } : null)}
                    className={`h-2 w-2 rounded-full transition-all ${
                      i === lightboxData.index ? 'bg-blue-500 w-6' : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
              <p className="text-white/60 text-sm font-medium">
                Ảnh {lightboxData.index + 1} / {lightboxData.images.length}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
