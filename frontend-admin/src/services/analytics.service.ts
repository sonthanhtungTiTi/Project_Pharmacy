import { apiGet } from '../utils/api.utils'

// ============== Types ==============
export interface DashboardStats {
  revenue: {
    total: number
    today: number
    thisMonth: number
  }
  orders: {
    total: number
    today: number
    thisMonth: number
    byStatus: Record<string, number>
  }
  users: {
    total: number
    newThisMonth: number
  }
  products: {
    total: number
    active: number
    inactive: number
  }
}

export interface RevenueDataPoint {
  date: string
  revenue: number
  orders: number
  avgOrderValue: number
}

export interface RevenueChartData {
  period: string
  days: number
  data: RevenueDataPoint[]
}

export interface TopProduct {
  productId: string
  productName: string
  productImage: string
  totalSold: number
  totalRevenue: number
  orderCount: number
}

export interface LowStockProduct {
  id: string
  medicineCode: string
  productName: string
  images: string
  price: number
  totalStock: number
}

export interface ExpiringBatch {
  batchNumber: string
  quantity: number
  expiryDate: string
  daysLeft: number
}

export interface ExpiringProduct {
  id: string
  medicineCode: string
  productName: string
  expiringBatches: ExpiringBatch[]
}

export interface RecentOrder {
  id: string
  orderCode: string
  customer: { id: string; fullName: string; email: string }
  totalAmount: number
  totalQuantity: number
  status: string
  paymentMethod: string
  paymentStatus: string
  placedAt: string
  createdAt: string
}

export interface InventoryOverview {
  totalProducts: number
  totalBatches: number
  totalStock: number
  totalValue: number
  outOfStock: number
  lowStock: number
  expiredBatches: number
  expiringSoon: number
}

// ============== Service ==============
const analyticsService = {
  // Dashboard tổng quan
  getDashboardStats: async (): Promise<DashboardStats> => {
    const data = await apiGet('/admin/analytics/dashboard')
    return data.data
  },

  // Biểu đồ doanh thu
  getRevenueChart: async (period = 'daily', days = 30): Promise<RevenueChartData> => {
    const data = await apiGet(`/admin/analytics/revenue?period=${period}&days=${days}`)
    return data.data
  },

  // Sản phẩm bán chạy
  getTopProducts: async (limit = 10): Promise<TopProduct[]> => {
    const data = await apiGet(`/admin/analytics/top-products?limit=${limit}`)
    return data.data
  },

  // Sản phẩm sắp hết hàng
  getLowStockProducts: async (threshold = 10): Promise<LowStockProduct[]> => {
    const data = await apiGet(`/admin/analytics/low-stock?threshold=${threshold}`)
    return data.data
  },

  // Sản phẩm sắp hết hạn
  getExpiringProducts: async (daysUntilExpiry = 90): Promise<ExpiringProduct[]> => {
    const data = await apiGet(`/admin/analytics/expiring?daysUntilExpiry=${daysUntilExpiry}`)
    return data.data
  },

  // Đơn hàng gần đây
  getRecentOrders: async (limit = 10): Promise<RecentOrder[]> => {
    const data = await apiGet(`/admin/analytics/recent-orders?limit=${limit}`)
    return data.data
  },

  // Tổng quan kho
  getInventoryOverview: async (): Promise<InventoryOverview> => {
    const data = await apiGet('/admin/inventory/overview')
    return data.data
  },
}

export default analyticsService
