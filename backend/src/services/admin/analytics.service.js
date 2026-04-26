const Order = require('../../models/order.model')
const Product = require('../../models/product.model')
const User = require('../../models/user.model')

class AnalyticsServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

/**
 * Dashboard overview stats
 */
const getDashboardStats = async () => {
	const now = new Date()
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
	const startOfYear = new Date(now.getFullYear(), 0, 1)

	const [
		totalOrders,
		ordersToday,
		ordersThisMonth,
		totalUsers,
		newUsersThisMonth,
		totalProducts,
		activeProducts,
		revenueResult,
		revenueTodayResult,
		revenueThisMonthResult,
		ordersByStatus,
	] = await Promise.all([
		Order.countDocuments(),
		Order.countDocuments({ createdAt: { $gte: startOfToday } }),
		Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
		User.countDocuments(),
		User.countDocuments({ createdAt: { $gte: startOfMonth } }),
		Product.countDocuments(),
		Product.countDocuments({ isActive: { $ne: false } }),

		// Tổng doanh thu (chỉ tính completed)
		Order.aggregate([
			{ $match: { status: 'completed' } },
			{ $group: { _id: null, total: { $sum: '$totalAmount' } } },
		]),

		// Doanh thu hôm nay
		Order.aggregate([
			{ $match: { status: 'completed', createdAt: { $gte: startOfToday } } },
			{ $group: { _id: null, total: { $sum: '$totalAmount' } } },
		]),

		// Doanh thu tháng này
		Order.aggregate([
			{ $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
			{ $group: { _id: null, total: { $sum: '$totalAmount' } } },
		]),

		// Thống kê theo status
		Order.aggregate([
			{ $group: { _id: '$status', count: { $sum: 1 } } },
		]),
	])

	const statusCounts = {}
	for (const s of ordersByStatus) {
		statusCounts[s._id] = s.count
	}

	return {
		revenue: {
			total: revenueResult[0]?.total || 0,
			today: revenueTodayResult[0]?.total || 0,
			thisMonth: revenueThisMonthResult[0]?.total || 0,
		},
		orders: {
			total: totalOrders,
			today: ordersToday,
			thisMonth: ordersThisMonth,
			byStatus: statusCounts,
		},
		users: {
			total: totalUsers,
			newThisMonth: newUsersThisMonth,
		},
		products: {
			total: totalProducts,
			active: activeProducts,
			inactive: totalProducts - activeProducts,
		},
	}
}

/**
 * Doanh thu theo ngày (chart data)
 */
const getRevenueChart = async ({ period = 'daily', days = 30 } = {}) => {
	const numDays = Math.min(365, Math.max(1, Number(days) || 30))
	const startDate = new Date()
	startDate.setDate(startDate.getDate() - numDays)
	startDate.setHours(0, 0, 0, 0)

	let groupBy
	let dateFormat

	if (period === 'monthly') {
		groupBy = {
			year: { $year: '$createdAt' },
			month: { $month: '$createdAt' },
		}
		dateFormat = (item) => `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
	} else if (period === 'weekly') {
		groupBy = {
			year: { $isoWeekYear: '$createdAt' },
			week: { $isoWeek: '$createdAt' },
		}
		dateFormat = (item) => `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`
	} else {
		groupBy = {
			year: { $year: '$createdAt' },
			month: { $month: '$createdAt' },
			day: { $dayOfMonth: '$createdAt' },
		}
		dateFormat = (item) =>
			`${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`
	}

	const data = await Order.aggregate([
		{
			$match: {
				status: 'completed',
				createdAt: { $gte: startDate },
			},
		},
		{
			$group: {
				_id: groupBy,
				revenue: { $sum: '$totalAmount' },
				orders: { $sum: 1 },
				avgOrderValue: { $avg: '$totalAmount' },
			},
		},
		{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
	])

	return {
		period,
		days: numDays,
		data: data.map((item) => ({
			date: dateFormat(item),
			revenue: item.revenue,
			orders: item.orders,
			avgOrderValue: Math.round(item.avgOrderValue),
		})),
	}
}

/**
 * Sản phẩm bán chạy nhất
 */
const getTopProducts = async ({ limit = 10 } = {}) => {
	const numLimit = Math.min(50, Math.max(1, Number(limit) || 10))

	const data = await Order.aggregate([
		{ $match: { status: { $in: ['completed', 'shipping', 'confirmed'] } } },
		{ $unwind: '$items' },
		{
			$group: {
				_id: '$items.productId',
				productName: { $first: '$items.productName' },
				productImage: { $first: '$items.productImage' },
				totalSold: { $sum: '$items.quantity' },
				totalRevenue: { $sum: '$items.lineTotal' },
				orderCount: { $sum: 1 },
			},
		},
		{ $sort: { totalSold: -1 } },
		{ $limit: numLimit },
	])

	return data.map((item) => ({
		productId: String(item._id),
		productName: item.productName,
		productImage: item.productImage || '',
		totalSold: item.totalSold,
		totalRevenue: item.totalRevenue,
		orderCount: item.orderCount,
	}))
}

/**
 * Sản phẩm sắp hết hàng
 */
const getLowStockProducts = async ({ threshold = 10, limit = 20 } = {}) => {
	const numThreshold = Math.max(0, Number(threshold) || 10)
	const numLimit = Math.min(100, Math.max(1, Number(limit) || 20))

	const products = await Product.find({ isActive: { $ne: false } })
		.select('_id medicineCode productName images inventory price')
		.lean()

	// Tính tổng stock từ inventory batches
	const lowStock = products
		.map((p) => {
			const totalStock = (p.inventory || []).reduce((sum, b) => sum + (b.quantity || 0), 0)
			return {
				id: String(p._id),
				medicineCode: p.medicineCode,
				productName: p.productName,
				images: p.images || '',
				price: p.price,
				totalStock,
			}
		})
		.filter((p) => p.totalStock <= numThreshold)
		.sort((a, b) => a.totalStock - b.totalStock)
		.slice(0, numLimit)

	return lowStock
}

/**
 * Sản phẩm sắp hết hạn
 */
const getExpiringProducts = async ({ daysUntilExpiry = 90, limit = 20 } = {}) => {
	const numDays = Math.max(1, Number(daysUntilExpiry) || 90)
	const numLimit = Math.min(100, Math.max(1, Number(limit) || 20))

	const expiryThreshold = new Date()
	expiryThreshold.setDate(expiryThreshold.getDate() + numDays)

	const products = await Product.find({
		isActive: { $ne: false },
		'inventory.expiryDate': { $lte: expiryThreshold },
	})
		.select('_id medicineCode productName inventory')
		.lean()
		.limit(numLimit)

	const result = []
	for (const p of products) {
		const expiringBatches = (p.inventory || []).filter(
			(b) => new Date(b.expiryDate) <= expiryThreshold,
		)

		if (expiringBatches.length > 0) {
			result.push({
				id: String(p._id),
				medicineCode: p.medicineCode,
				productName: p.productName,
				expiringBatches: expiringBatches.map((b) => ({
					batchNumber: b.batchNumber,
					quantity: b.quantity,
					expiryDate: b.expiryDate,
					daysLeft: Math.ceil((new Date(b.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
				})),
			})
		}
	}

	return result
}

/**
 * Thống kê đơn hàng gần đây
 */
const getRecentOrders = async ({ limit = 10 } = {}) => {
	const numLimit = Math.min(50, Math.max(1, Number(limit) || 10))

	const orders = await Order.find()
		.populate('userId', 'fullName email')
		.sort({ createdAt: -1 })
		.limit(numLimit)
		.lean()

	return orders.map((o) => ({
		id: String(o._id),
		orderCode: o.orderCode,
		customer: {
			id: o.userId?._id ? String(o.userId._id) : '',
			fullName: o.userId?.fullName || '',
			email: o.userId?.email || '',
		},
		totalAmount: o.totalAmount,
		totalQuantity: o.totalQuantity,
		status: o.status,
		paymentMethod: o.paymentMethod,
		paymentStatus: o.paymentStatus,
		placedAt: o.placedAt,
		createdAt: o.createdAt,
	}))
}

module.exports = {
	AnalyticsServiceError,
	getDashboardStats,
	getRevenueChart,
	getTopProducts,
	getLowStockProducts,
	getExpiringProducts,
	getRecentOrders,
}
