import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api.utils'

// ============== Types ==============
export interface AdminProduct {
  id: string
  medicineCode: string
  productName: string
  medicineName: string
  price: number
  categoryId: string
  categoryName: string
  brand: string
  manufacturer: string
  images: string
  unit: string
  dosage: string
  usageSummary: string
  mainIngredients: string
  activeIngredient: string
  targetUsers: string
  ingredients: string
  usage: string
  contraindications: string
  sideEffects: string
  precautions: string
  pharmacology: string
  additionalInfo: string
  storage: string
  packaging: string
  expiry: string
  manufacturerDetail: string
  characteristics: string
  description: string
  requiresPrescription: boolean
  isActive: boolean
  inventory: InventoryBatch[]
  totalStock: number
  createdAt: string
  updatedAt: string
}

export interface InventoryBatch {
  batchNumber: string
  quantity: number
  expiryDate: string
  importPrice: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ProductListResponse {
  items: AdminProduct[]
  pagination: Pagination
}

export interface ProductQueryParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  status?: 'active' | 'inactive' | 'all'
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'name'
  priceMin?: number
  priceMax?: number
}

// ============== Service ==============
const adminProductService = {
  // Danh sách sản phẩm
  getProducts: async (params: ProductQueryParams = {}): Promise<ProductListResponse> => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.search) query.set('search', params.search)
    if (params.categoryId) query.set('categoryId', params.categoryId)
    if (params.status) query.set('status', params.status)
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.priceMin !== undefined) query.set('priceMin', String(params.priceMin))
    if (params.priceMax !== undefined) query.set('priceMax', String(params.priceMax))

    const data = await apiGet(`/admin/products?${query}`)
    return data.data
  },

  // Chi tiết sản phẩm
  getProductById: async (productId: string): Promise<AdminProduct> => {
    const data = await apiGet(`/admin/products/${productId}`)
    return data.data
  },

  // Tạo sản phẩm
  createProduct: async (productData: Partial<AdminProduct>): Promise<AdminProduct> => {
    const data = await apiPost('/admin/products', productData)
    return data.data
  },

  // Cập nhật sản phẩm
  updateProduct: async (productId: string, productData: Partial<AdminProduct>): Promise<AdminProduct> => {
    const data = await apiPatch(`/admin/products/${productId}`, productData)
    return data.data
  },

  // Xóa sản phẩm (soft delete)
  deleteProduct: async (productId: string): Promise<void> => {
    await apiDelete(`/admin/products/${productId}`)
  },

  // Thêm lô hàng
  addInventoryBatch: async (productId: string, batch: InventoryBatch): Promise<AdminProduct> => {
    const data = await apiPost(`/admin/products/${productId}/inventory`, batch)
    return data.data
  },
}

export default adminProductService
