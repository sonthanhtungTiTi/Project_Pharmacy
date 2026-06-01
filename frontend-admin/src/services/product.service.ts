import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api.utils'

export interface Category {
  id: string
  name?: string
  categoryName?: string
  description?: string
}

export interface Product {
  id?: string
  _id?: string
  medicineCode: string
  categoryId: string
  categoryName: string
  productName: string
  price: number | string
  usageSummary?: string
  mainIngredients?: string
  activeIngredient?: string
  targetUsers?: string
  brand?: string
  manufacturer?: string
  ingredients?: string
  usage?: string
  dosage?: string
  contraindications?: string
  sideEffects?: string
  precautions?: string
  pharmacology?: string
  additionalInfo?: string
  storage?: string
  packaging?: string
  expiry?: string
  manufacturerDetail?: string
  characteristics?: string
  description?: string
  images?: string | string[]
  inventory?: Array<{
    batchNumber?: string
    quantity?: number
    expiryDate?: string
    importPrice?: number
  }>
  totalStock?: number
  requiresPrescription?: boolean
  qrCode?: string
}

export interface ProductsResponse {
  success: boolean
  message: string
  data: {
    items: Product[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type medicinesResponse = ProductsResponse

export interface AddInventoryBatchPayload {
  batchNumber: string
  quantity: number
  expiryDate: string
  importPrice: number
}

const normalizeProduct = (product: any): Product => {
  const normalizedId = product?.id || product?._id || ''

  return {
    ...product,
    id: normalizedId,
    _id: product?._id || normalizedId,
  }
}

const normalizeProductsResponse = (response: any): ProductsResponse => {
  const rawItems =
    (Array.isArray(response?.data?.items) && response.data.items) ||
    (Array.isArray(response?.items) && response.items) ||
    (Array.isArray(response?.data) && response.data) ||
    []

  const items = rawItems.map((item: any) => normalizeProduct(item))

  const pagination = response?.data?.pagination || response?.pagination || {}

  const page = Number(pagination.page ?? response?.data?.page ?? 1) || 1
  const limit = Number(pagination.limit ?? response?.data?.limit ?? 20) || 20
  const total = Number(pagination.total ?? response?.data?.total ?? items.length) || 0
  const totalPages = Number(pagination.totalPages ?? response?.data?.totalPages ?? 1) || 1

  return {
    success: response?.success !== false,
    message: response?.message || 'Products fetched successfully',
    data: {
      items,
      total,
      page,
      limit,
      totalPages,
    },
  }
}

const normalizeCategories = (response: any): Category[] => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data?.items)) return response.data.items
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.data)) return response.data
  return []
}

const medicineservice = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiGet('/admin/categories/')
    return normalizeCategories(response)
  },

  getProducts: async (page = 1, limit = 20, filters?: Record<string, any>): Promise<ProductsResponse> => {
    const normalizedFilters = { ...(filters || {}) }

    // Backend expects categoryId, while some screens send category.
    if (normalizedFilters.category && !normalizedFilters.categoryId) {
      normalizedFilters.categoryId = normalizedFilters.category
    }
    delete normalizedFilters.category

    // Avoid sending empty query values that fail backend Joi validation.
    Object.keys(normalizedFilters).forEach((key) => {
      const value = normalizedFilters[key]
      if (value === '' || value === null || value === undefined) {
        delete normalizedFilters[key]
      }
    })

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...normalizedFilters,
    })

    const response = await apiGet(`/admin/products/?${params}`)
    return normalizeProductsResponse(response)
  },

  getmedicines: async (page = 1, limit = 20, filters?: any): Promise<medicinesResponse> => {
    return medicineservice.getProducts(page, limit, filters)
  },

  getProductById: async (productId: string): Promise<Product> => {
    const response = await apiGet(`/admin/products/${productId}`)
    return normalizeProduct(response?.data || response)
  },

  createProduct: async (productData: any): Promise<Product> => {
    const response = await apiPost('/admin/products/', productData)
    return normalizeProduct(response?.data || response)
  },

  updateProduct: async (productId: string, productData: any): Promise<Product> => {
    const response = await apiPatch(`/admin/products/${productId}`, productData)
    return normalizeProduct(response?.data || response)
  },

  updateProductPrice: async (productId: string, price: string): Promise<Product> => {
    const response = await apiPatch(`/admin/products/${productId}`, { price })
    return response?.data || response
  },

  addInventoryBatch: async (productId: string, batchData: AddInventoryBatchPayload): Promise<Product> => {
    const response = await apiPost(`/admin/products/${productId}/inventory`, batchData)
    return normalizeProduct(response?.data || response)
  },

  deleteProduct: async (productId: string): Promise<void> => {
    await apiDelete(`/admin/products/${productId}`)
  },

  bulkDeleteProducts: async (productIds: string[]): Promise<void> => {
    await Promise.all(productIds.map((productId) => apiDelete(`/admin/products/${productId}`)))
  },

  bulkDeletemedicines: async (productIds: string[]): Promise<void> => {
    await medicineservice.bulkDeleteProducts(productIds)
  },
}

export default medicineservice
