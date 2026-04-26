const analyticsService = require('../../services/admin/analytics.service')

const getDashboardStats = async (req, res) => {
	try {
		const data = await analyticsService.getDashboardStats()

		return res.status(200).json({
			success: true,
			message: 'Dashboard stats fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch dashboard stats failed',
		})
	}
}

const getRevenueChart = async (req, res) => {
	try {
		const data = await analyticsService.getRevenueChart(req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Revenue chart fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch revenue chart failed',
		})
	}
}

const getTopProducts = async (req, res) => {
	try {
		const data = await analyticsService.getTopProducts(req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Top products fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch top products failed',
		})
	}
}

const getLowStockProducts = async (req, res) => {
	try {
		const data = await analyticsService.getLowStockProducts(req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Low stock products fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch low stock products failed',
		})
	}
}

const getExpiringProducts = async (req, res) => {
	try {
		const data = await analyticsService.getExpiringProducts(req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Expiring products fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch expiring products failed',
		})
	}
}

const getRecentOrders = async (req, res) => {
	try {
		const data = await analyticsService.getRecentOrders(req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Recent orders fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch recent orders failed',
		})
	}
}

module.exports = {
	getDashboardStats,
	getRevenueChart,
	getTopProducts,
	getLowStockProducts,
	getExpiringProducts,
	getRecentOrders,
}
