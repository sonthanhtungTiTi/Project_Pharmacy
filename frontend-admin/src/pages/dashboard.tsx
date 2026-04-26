import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowsRotate,
  faChartLine,
  faCircleCheck,
  faFileInvoice,
  faHourglassHalf,
  faMoneyBillWave,
  faTriangleExclamation,
  faTrophy,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import Box from '@mui/material/Box'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { styled, useTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { BarChart, barClasses } from '@mui/x-charts/BarChart'
import { PieChart, pieClasses } from '@mui/x-charts/PieChart'
import { useAuthStore } from '../stores/authStore'
import analyticsService from '../services/analytics.service'
import type { DashboardStats, RecentOrder, LowStockProduct, RevenueDataPoint, TopProduct } from '../services/analytics.service'
///sủa ui
const ChartPanel = styled(Box)(({ theme }: { theme: Theme }) => ({
  border: `1px solid ${theme.palette.grey[200]}`,
  borderRadius: 12,
  backgroundColor: theme.palette.common.white,
  boxShadow: theme.shadows[1],
  padding: theme.spacing(2.5),
}))

const CHART_SLOW_ANIMATION_MS = 950

const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3)

const formatInlineCurrency = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

export default function Dashboard() {
  const { user } = useAuthStore()
  const theme = useTheme()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([])
  const [animatedRevenueBarDataset, setAnimatedRevenueBarDataset] = useState<Array<{ label: string; revenue: number }>>([])
  const [animatedTopProductDataset, setAnimatedTopProductDataset] = useState<Array<{ name: string; sold: number }>>([])
  const [animatedOrderStatusPieData, setAnimatedOrderStatusPieData] = useState<Array<{ id: number; value: number; label: string; color: string }>>([])
  const [revenueDays, setRevenueDays] = useState<7 | 14 | 30>(7)
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [revenueError, setRevenueError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const revenueAnimationFrameRef = useRef<number | null>(null)
  const topProductsAnimationFrameRef = useRef<number | null>(null)
  const pieAnimationFrameRef = useRef<number | null>(null)
  const revenueAnimatedRef = useRef<Array<{ label: string; revenue: number }>>([])
  const topProductsAnimatedRef = useRef<Array<{ name: string; sold: number }>>([])
  const pieAnimatedRef = useRef<Array<{ id: number; value: number; label: string; color: string }>>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    loadRevenueChart(revenueDays)
  }, [revenueDays])

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashStats, orders, lowStockItems, topItems] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getRecentOrders(5),
        analyticsService.getLowStockProducts(10),
        analyticsService.getTopProducts(5),
      ])
      setStats(dashStats && typeof dashStats === 'object' ? dashStats : null)
      setRecentOrders(Array.isArray(orders) ? orders : [])
      setLowStock(Array.isArray(lowStockItems) ? lowStockItems : [])
      setTopProducts(Array.isArray(topItems) ? topItems : [])
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadRevenueChart = async (days: 7 | 14 | 30) => {
    setRevenueLoading(true)
    setRevenueError(null)
    try {
      const chart = await analyticsService.getRevenueChart('daily', days)
      setRevenueData(Array.isArray(chart?.data) ? chart.data : [])
    } catch (err: any) {
      setRevenueData([])
      setRevenueError(err.message || 'Không thể tải dữ liệu doanh thu theo ngày')
    } finally {
      setRevenueLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const formatChartDate = (dateValue: string) => {
    const parsed = new Date(dateValue)
    if (Number.isNaN(parsed.getTime())) return dateValue
    return parsed.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipping: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      shipping: 'Đang giao',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    }
    return labels[status] || status
  }

  const revenueStats = stats?.revenue ?? { total: 0, today: 0, thisMonth: 0 }
  const orderStats = stats?.orders ?? { total: 0, today: 0, thisMonth: 0, byStatus: {} as Record<string, number> }
  const userStats = stats?.users ?? { total: 0, newThisMonth: 0 }
  const productStats = stats?.products ?? { total: 0, active: 0, inactive: 0 }
  const orderStatusStats = orderStats.byStatus ?? {}

  const statCards: Array<{ label: string; value: string; sub: string; icon: IconDefinition; borderColor: string }> = [
    { label: 'DOANH THU HÔM NAY', value: formatCurrency(Number(revenueStats.today || 0)), sub: `Tháng: ${formatCurrency(Number(revenueStats.thisMonth || 0))}`, icon: faMoneyBillWave, borderColor: 'border-l-green-500' },
    { label: 'ĐƠN HÀNG HÔM NAY', value: String(Number(orderStats.today || 0)), sub: `Tháng: ${Number(orderStats.thisMonth || 0)} đơn`, icon: faFileInvoice, borderColor: 'border-l-blue-500' },
    { label: 'KHÁCH HÀNG MỚI', value: String(Number(userStats.newThisMonth || 0)), sub: `Tổng: ${Number(userStats.total || 0)} người`, icon: faUsers, borderColor: 'border-l-purple-500' },
    { label: 'CHỜ XỬ LÝ', value: String(Number(orderStatusStats.pending || 0)), sub: `${Number(orderStatusStats.shipping || 0)} đang giao`, icon: faHourglassHalf, borderColor: 'border-l-orange-500' },
  ]

  const revenueBarDataset = useMemo(
    () => revenueData.map((point) => ({
      label: formatChartDate(point?.date || ''),
      revenue: Number(point?.revenue || 0),
    })),
    [revenueData],
  )

  const orderStatusPieData = useMemo(() => {
    const byStatus = stats?.orders?.byStatus || {}
    return [
      { id: 1, value: byStatus.pending || 0, label: 'Chờ xử lý', color: '#f59e0b' },
      { id: 2, value: byStatus.confirmed || 0, label: 'Đã xác nhận', color: '#3b82f6' },
      { id: 3, value: byStatus.shipping || 0, label: 'Đang giao', color: '#8b5cf6' },
      { id: 4, value: byStatus.completed || 0, label: 'Hoàn thành', color: '#22c55e' },
      { id: 5, value: byStatus.cancelled || 0, label: 'Đã hủy', color: '#ef4444' },
    ].filter((item) => item.value > 0)
  }, [stats])

  const orderStatusValueById = useMemo(() => {
    return new Map(orderStatusPieData.map((item) => [String(item.id), Number(item.value || 0)]))
  }, [orderStatusPieData])

  const topProductDataset = useMemo(
    () => topProducts.slice(0, 5).map((item) => ({
      name: (item?.productName || 'Sản phẩm').length > 24
        ? `${(item?.productName || 'Sản phẩm').slice(0, 24)}...`
        : (item?.productName || 'Sản phẩm'),
      sold: Number(item?.totalSold || 0),
    })),
    [topProducts],
  )

  useEffect(() => {
    if (revenueAnimationFrameRef.current) {
      cancelAnimationFrame(revenueAnimationFrameRef.current)
      revenueAnimationFrameRef.current = null
    }

    if (revenueBarDataset.length === 0) {
      setAnimatedRevenueBarDataset([])
      revenueAnimatedRef.current = []
      return
    }

    const fromValues = revenueBarDataset.map((_item, index) => revenueAnimatedRef.current[index]?.revenue ?? 0)
    const startedAt = performance.now()

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / CHART_SLOW_ANIMATION_MS, 1)
      const eased = easeOutCubic(progress)

      const nextFrame = revenueBarDataset.map((item, index) => ({
        ...item,
        revenue: Math.round(fromValues[index] + (item.revenue - fromValues[index]) * eased),
      }))

      revenueAnimatedRef.current = nextFrame
      setAnimatedRevenueBarDataset(nextFrame)

      if (progress < 1) {
        revenueAnimationFrameRef.current = requestAnimationFrame(animate)
      } else {
        revenueAnimationFrameRef.current = null
      }
    }

    revenueAnimationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (revenueAnimationFrameRef.current) {
        cancelAnimationFrame(revenueAnimationFrameRef.current)
        revenueAnimationFrameRef.current = null
      }
    }
  }, [revenueBarDataset])

  useEffect(() => {
    if (topProductsAnimationFrameRef.current) {
      cancelAnimationFrame(topProductsAnimationFrameRef.current)
      topProductsAnimationFrameRef.current = null
    }

    if (topProductDataset.length === 0) {
      setAnimatedTopProductDataset([])
      topProductsAnimatedRef.current = []
      return
    }

    const fromValues = topProductDataset.map((_item, index) => topProductsAnimatedRef.current[index]?.sold ?? 0)
    const startedAt = performance.now()

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / CHART_SLOW_ANIMATION_MS, 1)
      const eased = easeOutCubic(progress)

      const nextFrame = topProductDataset.map((item, index) => ({
        ...item,
        sold: Math.round(fromValues[index] + (item.sold - fromValues[index]) * eased),
      }))

      topProductsAnimatedRef.current = nextFrame
      setAnimatedTopProductDataset(nextFrame)

      if (progress < 1) {
        topProductsAnimationFrameRef.current = requestAnimationFrame(animate)
      } else {
        topProductsAnimationFrameRef.current = null
      }
    }

    topProductsAnimationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (topProductsAnimationFrameRef.current) {
        cancelAnimationFrame(topProductsAnimationFrameRef.current)
        topProductsAnimationFrameRef.current = null
      }
    }
  }, [topProductDataset])

  useEffect(() => {
    if (pieAnimationFrameRef.current) {
      cancelAnimationFrame(pieAnimationFrameRef.current)
      pieAnimationFrameRef.current = null
    }

    if (orderStatusPieData.length === 0) {
      setAnimatedOrderStatusPieData([])
      pieAnimatedRef.current = []
      return
    }

    const previousById = new Map(pieAnimatedRef.current.map((item) => [String(item.id), Number(item.value || 0)]))
    const fromValues = orderStatusPieData.map((item) => previousById.get(String(item.id)) ?? 0)
    const startedAt = performance.now()

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / CHART_SLOW_ANIMATION_MS, 1)
      const eased = easeOutCubic(progress)

      const nextFrame = orderStatusPieData.map((item, index) => ({
        ...item,
        value: Math.round(fromValues[index] + (item.value - fromValues[index]) * eased),
      }))

      pieAnimatedRef.current = nextFrame
      setAnimatedOrderStatusPieData(nextFrame)

      if (progress < 1) {
        pieAnimationFrameRef.current = requestAnimationFrame(animate)
      } else {
        pieAnimationFrameRef.current = null
      }
    }

    pieAnimationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (pieAnimationFrameRef.current) {
        cancelAnimationFrame(pieAnimationFrameRef.current)
        pieAnimationFrameRef.current = null
      }
    }
  }, [orderStatusPieData])

  // Early returns must come AFTER all hooks are called
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={loadDashboard} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          Thử lại
        </button>
      </div>
    )
  }

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Đang tải dashboard...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={loadDashboard} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Thử lại
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">Xin chào, {user?.fullName || 'Admin'}! Tổng quan hoạt động nhà thuốc.</p>
            </div>
            <button onClick={loadDashboard} className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
              <FontAwesomeIcon icon={faArrowsRotate} /> Làm mới
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {statCards.map((card, idx) => (
              <div key={idx} className={`bg-white rounded-lg p-5 shadow-sm border border-gray-200 border-l-4 ${card.borderColor}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
                  </div>
                  <FontAwesomeIcon icon={card.icon} className="text-3xl text-gray-500" />
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <ChartPanel>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Doanh Thu Theo Ngày
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    value={revenueDays}
                    exclusive
                    onChange={(_, value: 7 | 14 | 30 | null) => {
                      if (value) setRevenueDays(value)
                    }}
                  >
                    <ToggleButton value={7}>7 ngày</ToggleButton>
                    <ToggleButton value={14}>14 ngày</ToggleButton>
                    <ToggleButton value={30}>30 ngày</ToggleButton>
                  </ToggleButtonGroup>
                </div>

                {revenueLoading ? (
                  <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">Đang tải biểu đồ doanh thu...</div>
                ) : revenueError ? (
                  <div className="h-[320px] flex items-center justify-center text-sm text-red-600">{revenueError}</div>
                ) : revenueBarDataset.length === 0 ? (
                  <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">Chưa có dữ liệu doanh thu trong khoảng thời gian này.</div>
                ) : (
                  <BarChart
                    dataset={animatedRevenueBarDataset}
                    xAxis={[{ scaleType: 'band', dataKey: 'label', tickLabelStyle: { fontSize: 11 } }]}
                    yAxis={[{
                      tickLabelStyle: { fontSize: 11 },
                      valueFormatter: (value: number) => `${Math.round(Number(value) / 1000)}k`,
                    }]}
                    series={[{
                      dataKey: 'revenue',
                      label: 'Doanh thu (VND)',
                      color: theme.palette.success.main,
                      valueFormatter: (value) => formatCurrency(Number(value || 0)),
                      barLabel: (item) => {
                        const numericValue = Number(revenueBarDataset[item.dataIndex]?.revenue || 0)
                        if (numericValue <= 0) {
                          return null
                        }

                        return formatInlineCurrency(numericValue)
                      },
                      barLabelPlacement: 'center',
                    }]}
                    margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
                    grid={{ horizontal: true }}
                    height={320}
                    skipAnimation
                    sx={{
                      [`& .${barClasses.label}`]: {
                        fill: '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        pointerEvents: 'none',
                      },
                    }}
                  />
                )}
              </ChartPanel>
            </div>

            <div className="xl:col-span-1">
              <ChartPanel>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Tỷ Trọng Trạng Thái Đơn
                  </Typography>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900 leading-none">{Number(orderStats.total || 0)}</p>
                    <p className="text-xs text-gray-500 mt-1">Đơn hàng</p>
                  </div>
                </div>
                {orderStatusPieData.length === 0 ? (
                  <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">Chưa có dữ liệu trạng thái đơn hàng.</div>
                ) : (
                  <PieChart
                    height={320}
                    margin={{ top: 20, bottom: 20, left: 10, right: 120 }}
                    series={[{
                      data: animatedOrderStatusPieData,
                      innerRadius: 56,
                      outerRadius: 98,
                      paddingAngle: 3,
                      cornerRadius: 4,
                      arcLabel: (item) => {
                        const trueValue = orderStatusValueById.get(String(item.id)) ?? Number(item.value || 0)
                        if (trueValue <= 0) {
                          return ''
                        }

                        return new Intl.NumberFormat('vi-VN').format(trueValue)
                      },
                      arcLabelMinAngle: 12,
                      cx: 120,
                      cy: 150,
                    }]}
                    skipAnimation
                    slotProps={{
                      legend: {
                        direction: 'vertical',
                        position: { vertical: 'middle', horizontal: 'end' },
                      },
                    }}
                    sx={{
                      [`& .${pieClasses.series} path`]: {
                        stroke: '#fff',
                        strokeWidth: 1,
                      },
                      [`& .${pieClasses.arcLabel}`]: {
                        fill: '#ffffff',
                        fontSize: 12,
                        fontWeight: 700,
                        pointerEvents: 'none',
                      },
                    }}
                  />
                )}
              </ChartPanel>
            </div>
          </div>

          <ChartPanel>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Sản Lượng Bán Theo Sản Phẩm
            </Typography>
            {topProductDataset.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">Chưa có dữ liệu sản lượng sản phẩm.</div>
            ) : (
              <BarChart
                dataset={animatedTopProductDataset}
                layout="horizontal"
                yAxis={[{ scaleType: 'band', dataKey: 'name', width: 170, tickLabelStyle: { fontSize: 11 } }]}
                xAxis={[{ tickLabelStyle: { fontSize: 11 } }]}
                series={[{
                  dataKey: 'sold',
                  label: 'Số lượng bán',
                  color: theme.palette.primary.main,
                  valueFormatter: (value) => `${Number(value || 0)} sản phẩm`,
                  barLabel: (item) => {
                    const numericValue = Number(topProductDataset[item.dataIndex]?.sold || 0)
                    if (numericValue <= 0) {
                      return null
                    }

                    return new Intl.NumberFormat('vi-VN').format(numericValue)
                  },
                  barLabelPlacement: 'center',
                }]}
                margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
                grid={{ vertical: true }}
                height={320}
                skipAnimation
                sx={{
                  [`& .${barClasses.label}`]: {
                    fill: '#ffffff',
                    fontSize: 11,
                    fontWeight: 700,
                    pointerEvents: 'none',
                  },
                }}
              />
            )}
          </ChartPanel>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Orders */}
            <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Đơn Hàng Gần Đây</h2>
                <button onClick={() => navigate('/orders')} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Xem tất cả →
                </button>
              </div>

              {recentOrders.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Chưa có đơn hàng nào</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs">MÃ ĐƠN</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs">KHÁCH HÀNG</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs">TRẠNG THÁI</th>
                        <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs">TỔNG TIỀN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order, idx) => (
                        <tr key={order?.id || `${order?.orderCode || 'order'}-${idx}`} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/orders')}>
                          <td className="py-3 px-3 font-medium text-gray-900 text-xs">{order?.orderCode || '--'}</td>
                          <td className="py-3 px-3 text-gray-700 text-xs">{order?.customer?.fullName || 'Khách hàng'}</td>
                          <td className="py-3 px-3">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(order?.status || 'pending')}`}>
                              {getStatusLabel(order?.status || 'pending')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-gray-900 text-xs">{formatCurrency(Number(order?.totalAmount || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Low Stock Alert */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-orange-200">
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faTriangleExclamation} className="text-orange-500" />
                <h2 className="text-lg font-bold text-gray-900">Cảnh Báo Tồn Kho</h2>
              </div>

              {lowStock.length === 0 ? (
                <p className="text-green-600 text-sm text-center py-6">
                  <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
                  Tất cả sản phẩm đều đủ hàng
                </p>
              ) : (
                <div className="space-y-2">
                  {lowStock.slice(0, 5).map((item) => (
                    <div key={item?.id || item?.medicineCode || item?.productName} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{item?.productName || 'Sản phẩm'}</p>
                        <p className="text-xs text-gray-500">{item?.medicineCode || '--'}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${Number(item?.totalStock || 0) === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {Number(item?.totalStock || 0) === 0 ? 'Hết hàng' : `${Number(item?.totalStock || 0)} còn lại`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => navigate('/inventory')} className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
                QUẢN LÝ KHO →
              </button>
            </div>
          </div>

          {/* Bottom Row: Top Products + Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Products */}
            <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faTrophy} className="text-amber-500" />
                Sản Phẩm Bán Chạy
              </h2>
              {topProducts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Chưa có dữ liệu bán hàng</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, idx) => (
                    <div key={product?.productId || product?.productName || idx} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                      <span className="text-lg font-bold text-gray-400 w-6">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product?.productName || 'Sản phẩm'}</p>
                        <p className="text-xs text-gray-500">{Number(product?.orderCount || 0)} đơn hàng</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">{Number(product?.totalSold || 0)} đã bán</p>
                        <p className="text-xs text-gray-500">{formatCurrency(Number(product?.totalRevenue || 0))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overview Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6 shadow-sm text-white">
              <h2 className="text-sm font-bold mb-4 opacity-90 flex items-center gap-2">
                <FontAwesomeIcon icon={faChartLine} />
                TỔNG QUAN
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">{formatCurrency(Number(revenueStats.total || 0))}</p>
                  <p className="text-xs opacity-70 mt-1">Tổng doanh thu</p>
                </div>
                <div className="border-t border-blue-400 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Tổng đơn hàng</span>
                    <span className="font-bold">{Number(orderStats.total || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Sản phẩm</span>
                    <span className="font-bold">{Number(productStats.active || 0)} / {Number(productStats.total || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Hoàn thành</span>
                    <span className="font-bold">{Number(orderStatusStats.completed || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Đã hủy</span>
                    <span className="font-bold text-red-300">{Number(orderStatusStats.cancelled || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
// hahahahahahahah