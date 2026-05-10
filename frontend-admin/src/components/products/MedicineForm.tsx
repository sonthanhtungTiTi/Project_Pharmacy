import { useEffect, useState } from 'react'
import axios from 'axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faPlus } from '@fortawesome/free-solid-svg-icons'
import productService, { type Product } from '../../services/product.service'

interface MedicineFormProps {
  medicine?: Product
  categoryId: string
  categoryName: string
  onSaved: (product: Product, mode: 'create' | 'update') => void
  onCancel: () => void
}

type FormFieldValue = string | number | Blob | File | string[]
type FormDataState = Record<string, FormFieldValue>

const buildInitialFormData = (medicine?: Product) => ({
  medicineCode: medicine?.medicineCode || '',
  productName: medicine?.productName || '',
  price: medicine?.price !== undefined ? String(medicine.price) : '',
  usageSummary: medicine?.usageSummary || medicine?.description || '',
  mainIngredients: medicine?.mainIngredients || medicine?.activeIngredient || '',
  targetUsers: medicine?.targetUsers || '',
  brand: medicine?.brand || '',
  manufacturer: medicine?.manufacturer || '',
  ingredients: medicine?.ingredients || '',
  usage: medicine?.usage || '',
  dosage: medicine?.dosage || '',
  contraindications: medicine?.contraindications || '',
  sideEffects: medicine?.sideEffects || '',
  precautions: medicine?.precautions || '',
  storage: medicine?.storage || '',
  packaging: medicine?.packaging || '',
  expiry: medicine?.expiry || '',
  description: medicine?.description || '',
  images: Array.isArray(medicine?.images) ? medicine.images.join('; ') : (medicine?.images || ''),
})

const normalizeSavedProduct = (payload: any): Product => {
  const product = payload?.data?.data || payload?.data || payload
  const normalizedId = product?.id || product?._id || ''

  return {
    ...product,
    id: normalizedId,
    _id: product?._id || normalizedId,
  }
}

const hasBinaryPayload = (payload: FormDataState) => {
  return Object.values(payload).some((value) => value instanceof File || value instanceof Blob)
}

const buildPayload = (payload: FormDataState) => {
  if (!hasBinaryPayload(payload)) {
    return {
      body: payload,
      contentType: 'application/json',
    }
  }

  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }

    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value)
      return
    }

    formData.append(key, String(value))
  })

  return {
    body: formData,
    contentType: 'multipart/form-data',
  }
}

const isRetryableProductUpdateError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false
  }

  return error.response?.status === 404 || error.response?.status === 405
}

const getCurrentTotalStock = (medicine?: Product) => {
  if (!medicine) {
    return 0
  }

  if (typeof medicine.totalStock === 'number') {
    return medicine.totalStock
  }

  return (medicine.inventory || []).reduce((sum, batch) => sum + Number(batch.quantity || 0), 0)
}

const parseStockToAdd = (rawValue: string) => {
  const trimmed = rawValue.trim()
  if (!trimmed) {
    return 0
  }

  return Number.parseInt(trimmed, 10)
}

export default function MedicineForm({ medicine, categoryId, categoryName, onSaved, onCancel }: MedicineFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(buildInitialFormData(medicine))
  const [stockToAdd, setStockToAdd] = useState('')
  const currentTotalStock = getCurrentTotalStock(medicine)

  useEffect(() => {
    setFormData(buildInitialFormData(medicine))
    setStockToAdd('')
    setError(null)
  }, [medicine])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSave = async () => {
    if (!formData.medicineCode || !formData.productName || !formData.price) {
      setError('Vui lòng nhập các trường bắt buộc')
      return
    }

    const selectedId = medicine?.id || medicine?._id || ''
    const numericPrice = Number(String(formData.price).replace(/[^\d.-]/g, ''))

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setError('Giá không hợp lệ')
      return
    }

    const quantityToAdd = parseStockToAdd(stockToAdd)
    if (!Number.isFinite(quantityToAdd) || quantityToAdd < 0) {
      setError('Số lượng tồn thêm không hợp lệ')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const submitData: FormDataState = {
        ...formData,
        medicineCode: formData.medicineCode.trim(),
        productName: formData.productName.trim(),
        price: numericPrice,
        categoryId,
        categoryName,
        images: typeof formData.images === 'string' 
          ? formData.images.split(';').map(s => s.trim()).filter(Boolean)
          : formData.images,
      }

      const addStockBatchIfNeeded = async (targetProductId: string, unitImportPrice: number) => {
        if (!quantityToAdd) {
          return null
        }

        const now = Date.now()
        const nextYearIso = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString()
        const inventoryPayload = {
          batchNumber: `AUTO-${now}`,
          quantity: quantityToAdd,
          expiryDate: nextYearIso,
          importPrice: unitImportPrice,
        }

        return productService.addInventoryBatch(targetProductId, inventoryPayload)
      }

      if (medicine) {
        if (!selectedId) {
          throw new Error('Không tìm thấy ID sản phẩm để cập nhật')
        }

        const { body, contentType } = buildPayload(submitData)
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
        const token = localStorage.getItem('adminAccessToken')
        const endpoints = [`${apiBaseUrl}/products/${selectedId}`, `${apiBaseUrl}/admin/products/${selectedId}`]
        let savedResponse: any = null
        let lastError: unknown

        for (const endpoint of endpoints) {
          try {
            const response = await axios.put(endpoint, body, {
              headers: {
                'Content-Type': contentType,
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            })

            savedResponse = response.data
            break
          } catch (endpointError) {
            lastError = endpointError

            if (isRetryableProductUpdateError(endpointError)) {
              continue
            }

            throw endpointError
          }
        }

        if (!savedResponse) {
          throw lastError || new Error('Không thể cập nhật sản phẩm')
        }

        const normalizedUpdatedProduct = normalizeSavedProduct(savedResponse)
        const inventoryUpdatedProduct = await addStockBatchIfNeeded(selectedId, numericPrice)
        onSaved(inventoryUpdatedProduct || normalizedUpdatedProduct, 'update')
      } else {
        const createdProduct = await productService.createProduct(submitData)
        const createdId = createdProduct.id || createdProduct._id || ''

        if (!createdId) {
          onSaved(createdProduct, 'create')
          return
        }

        const inventoryUpdatedProduct = await addStockBatchIfNeeded(createdId, numericPrice)
        onSaved(inventoryUpdatedProduct || createdProduct, 'create')
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { message?: string } | undefined)?.message
        setError(message || err.message || 'Lỗi khi lưu')
      } else {
        setError(err instanceof Error ? err.message : 'Lỗi khi lưu')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSave()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-3 md:p-6">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5 md:px-8 md:py-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <FontAwesomeIcon icon={medicine ? faPen : faPlus} className="text-blue-600" />
            {medicine ? 'Chỉnh sửa Thuốc' : 'Thêm Thuốc Mới'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6 md:p-8">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mã Thuốc <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="medicineCode"
                value={formData.medicineCode}
                onChange={handleChange}
                disabled={!!medicine}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Ví dụ: 106073"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tên Thuốc <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tên thuốc"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Giá <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="1000"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: 52500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nhà Sản Xuất</label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tên nhà sản xuất"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tồn Kho Hiện Tại</label>
              <input
                type="text"
                value={new Intl.NumberFormat('vi-VN').format(currentTotalStock)}
                disabled
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-gray-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nhập Thêm Tồn Kho</label>
              <input
                type="number"
                min="0"
                step="1"
                value={stockToAdd}
                onChange={(e) => setStockToAdd(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: 20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Link Ảnh (ngăn cách bằng dấu ;)</label>
              <input
                type="text"
                name="images"
                value={typeof formData.images === 'string' ? formData.images : ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image1.jpg; https://example.com/image2.jpg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Thương Hiệu</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tên thương hiệu"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Quy Cách Đóng Gói</label>
              <input
                type="text"
                name="packaging"
                value={formData.packaging}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: Hộp 3 vỉ x 10 viên"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Đối Tượng Sử Dụng</label>
              <input
                type="text"
                name="targetUsers"
                value={formData.targetUsers}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: Người lớn, Trẻ em trên 12 tuổi"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Hạn Sử Dụng (Thông tin)</label>
              <input
                type="text"
                name="expiry"
                value={formData.expiry}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: 36 tháng kể từ NSX"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô Tả Ngắn (Hiển thị đầu trang)</label>
            <textarea
              name="usageSummary"
              value={formData.usageSummary}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mô tả ngắn về công dụng"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Thành Phần (Ngắn gọn)</label>
            <textarea
              name="mainIngredients"
              value={formData.mainIngredients}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Các thành phần chính"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Thành Phần Chi Tiết</label>
              <textarea
                name="ingredients"
                value={formData.ingredients}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cách Dùng</label>
              <textarea
                name="usage"
                value={formData.usage}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Liều Dùng</label>
              <textarea
                name="dosage"
                value={formData.dosage}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Chống Chỉ Định</label>
              <textarea
                name="contraindications"
                value={formData.contraindications}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tác Dụng Phụ</label>
              <textarea
                name="sideEffects"
                value={formData.sideEffects}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Lưu Ý / Thận Trọng</label>
              <textarea
                name="precautions"
                value={formData.precautions}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bảo Quản</label>
              <textarea
                name="storage"
                value={formData.storage}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô Tả Chi Tiết (Bài viết dài)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nội dung bài viết chi tiết..."
            />
          </div>

          <div className="sticky bottom-0 -mx-6 border-t border-gray-200 bg-white px-6 pt-4 md:-mx-8 md:px-8">
            <div className="flex gap-3 pb-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
