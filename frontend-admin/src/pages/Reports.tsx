import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChartLine,
  faCircleCheck,
  faCircleXmark,
  faMoneyBillWave,
  faTriangleExclamation,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import analyticsService from '../services/analytics.service'
import type { RevenueChartData, TopProduct, ExpiringProduct, InventoryOverview } from '../services/analytics.service'

export default function ReportsPage() {
  const [revenueData, setRevenueData] = useState<RevenueChartData | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [expiringProducts, setExpiringProducts] = useState<ExpiringProduct[]>([])
  const [inventoryOverview, setInventoryOverview] = useState<InventoryOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [days, setDays] = useState(30)

  useEffect(() => {
    loadReports()
  }, [])

  useEffect(() => {
    loadRevenue()
  }, [period, days])

  const loadReports = async () => {
    setLoading(true)
    try {
      const [revenue, top, expiring, inventory] = await Promise.all([
        analyticsService.getRevenueChart(period, days),
        analyticsService.getTopProducts(10),
        analyticsService.getExpiringProducts(90),
        analyticsService.getInventoryOverview(),
      ])
      setRevenueData(revenue)
      setTopProducts(top)
      setExpiringProducts(expiring)
      setInventoryOverview(inventory)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadRevenue = async () => {
    try {
      const data = await analyticsService.getRevenueChart(period, days)
      setRevenueData(data)
    } catch { /* ignore */ }
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={loadReports} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Thử lại</button>
      </div>
    )
  }

  const maxRevenue = revenueData ? Math.max(...revenueData.data.map((d) => d.revenue), 1) : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <FontAwesomeIcon icon={faChartLine} className="text-blue-600" />
          Báo Cáo & Thống Kê
        </h1>
        <p className="text-gray-500 text-sm mt-1">Phân tích doanh thu, sản phẩm và kho hàng</p>
      </div>

      {/* Inventory Overview Cards */}
      {inventoryOverview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold">TỔNG SẢN PHẨM</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{inventoryOverview.totalProducts}</p>
            <p className="text-xs text-gray-400">{inventoryOverview.totalBatches} lô hàng</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold">TỔNG TỒN KHO</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{inventoryOverview.totalStock.toLocaleString()}</p>
            <p className="text-xs text-gray-400">{formatCurrency(inventoryOverview.totalValue)}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
            <p className="text-xs text-gray-500 font-semibold">HẾT HÀNG / SẮP HẾT</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{inventoryOverview.outOfStock} / {inventoryOverview.lowStock}</p>
            <p className="text-xs text-orange-500">Cần nhập thêm</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-red-200">
            <p className="text-xs text-gray-500 font-semibold">SẮP HẾT HẠN</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{inventoryOverview.expiringSoon}</p>
            <p className="text-xs text-red-500">{inventoryOverview.expiredBatches} đã hết hạn</p>
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FontAwesomeIcon icon={faMoneyBillWave} className="text-green-600" />
            Biểu Đồ Doanh Thu
          </h2>
          <div className="flex gap-2">
            <select value={period} onChange={(e) => setPeriod(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded-lg">
              <option value="daily">Theo ngày</option>
              <option value="weekly">Theo tuần</option>
              <option value="monthly">Theo tháng</option>
            </select>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-1 text-sm border rounded-lg">
              <option value={7}>7 ngày</option>
              <option value={30}>30 ngày</option>
              <option value={90}>90 ngày</option>
              <option value={365}>1 năm</option>
            </select>
          </div>
        </div>

        {revenueData && revenueData.data.length > 0 ? (
          <div className="h-64">
            <div className="flex items-end gap-1 h-full">
              {revenueData.data.map((point, idx) => {
                const height = (point.revenue / maxRevenue) * 100
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10">
                      <p className="font-bold">{formatCurrency(point.revenue)}</p>
                      <p>{point.orders} đơn • TB: {formatCurrency(point.avgOrderValue)}</p>
                      <p className="text-gray-400">{point.date}</p>
                    </div>
                    <div
                      className="w-full bg-blue-400 hover:bg-blue-500 rounded-t transition-all cursor-pointer min-h-[2px]"
                      style={{ height: `${Math.max(1, height)}%` }}
                    />
                    {revenueData.data.length <= 14 && (
                      <p className="text-[10px] text-gray-400 mt-1 truncate w-full text-center">
                        {point.date.split('-').slice(-1)[0]}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>Chưa có dữ liệu doanh thu cho khoảng thời gian này</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faTrophy} className="text-amber-500" />
            Sản Phẩm Bán Chạy
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <div key={product.productId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-200 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.productName}</p>
                    <p className="text-xs text-gray-500">{product.totalSold} đã bán • {product.orderCount} đơn</p>
                  </div>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(product.totalRevenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring Products */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-red-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-orange-500" />
            Sản Phẩm Sắp Hết Hạn
          </h2>
          {expiringProducts.length === 0 ? (
            <p className="text-green-600 text-sm text-center py-6">
              <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
              Không có sản phẩm sắp hết hạn
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {expiringProducts.map((product) => (
                <div key={product.id} className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{product.productName}</p>
                  <p className="text-xs text-gray-500 mb-2">{product.medicineCode}</p>
                  {product.expiringBatches.map((batch, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs mt-1">
                      <span className="text-gray-600">Lô {batch.batchNumber} ({batch.quantity} sp)</span>
                      <span className={`font-bold ${batch.daysLeft <= 0 ? 'text-red-700' : batch.daysLeft <= 30 ? 'text-orange-600' : 'text-yellow-600'}`}>
                        {batch.daysLeft <= 0 ? (
                          <>
                            <FontAwesomeIcon icon={faCircleXmark} className="mr-1" />
                            Đã hết hạn
                          </>
                        ) : (
                          `${batch.daysLeft} ngày`
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
