import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api.utils'

export interface Category {
  id: string
  name: string
  description?: string
}

export interface Medicine {
  _id: string
  medicineCode: string
  categoryId: string
  categoryName: string
  productName: string
  price: string
  usageSummary?: string
  mainIngredients?: string
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
  images?: string
}

export interface MedicinesResponse {
  success: boolean
  message: string
  data: {
    items: Medicine[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const medicineService = {
  getCategories: async (): Promise<Category[]> => {
    const data = await apiGet('/categories/')
    return data.data || []
  },

  getMedicines: async (page = 1, limit = 20, filters?: any): Promise<MedicinesResponse> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...filters,
    })

    return await apiGet(`/medicines/?${params}`)
  },

  getMedicineById: async (medicineId: string): Promise<Medicine> => {
    const data = await apiGet(`/medicines/${medicineId}`)
    return data.data
  },

  createMedicine: async (medicineData: any): Promise<Medicine> => {
    const data = await apiPost('/medicines/', medicineData)
    return data.data
  },

  updateMedicine: async (medicineId: string, medicineData: any): Promise<Medicine> => {
    const data = await apiPatch(`/medicines/${medicineId}`, medicineData)
    return data.data
  },

  updateMedicinePrice: async (medicineId: string, price: string): Promise<Medicine> => {
    const data = await apiPatch(`/medicines/${medicineId}/price`, { price })
    return data.data
  },

  deleteMedicine: async (medicineId: string): Promise<void> => {
    await apiDelete(`/medicines/${medicineId}`)
  },

  bulkDeleteMedicines: async (medicineIds: string[]): Promise<void> => {
    await apiPost('/medicines/bulk-delete', { medicineIds })
  },
}

export default medicineService
