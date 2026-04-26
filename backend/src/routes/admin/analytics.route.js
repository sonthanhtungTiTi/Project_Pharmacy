const express = require('express')

const analyticsController = require('../../controllers/admin/analytics.controller')
const { authorize } = require('../../middleware/authorize.middleware')
const { ROLE_GROUPS } = require('../../constants/roles')

const router = express.Router()

// Tất cả routes analytics chỉ cho manager + admin
router.use(authorize(ROLE_GROUPS.MANAGEMENT))

// GET /api/admin/analytics/dashboard — Tổng quan dashboard
router.get('/dashboard', analyticsController.getDashboardStats)

// GET /api/admin/analytics/revenue — Biểu đồ doanh thu
router.get('/revenue', analyticsController.getRevenueChart)

// GET /api/admin/analytics/top-products — Sản phẩm bán chạy
router.get('/top-products', analyticsController.getTopProducts)

// GET /api/admin/analytics/low-stock — Sản phẩm sắp hết hàng
router.get('/low-stock', analyticsController.getLowStockProducts)

// GET /api/admin/analytics/expiring — Sản phẩm sắp hết hạn
router.get('/expiring', analyticsController.getExpiringProducts)

// GET /api/admin/analytics/recent-orders — Đơn hàng gần đây
router.get('/recent-orders', analyticsController.getRecentOrders)

module.exports = router
