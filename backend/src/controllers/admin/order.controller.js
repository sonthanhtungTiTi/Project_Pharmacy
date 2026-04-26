const orderService = require('../../services/admin/order.service')

const listOrders = async (req, res) => {
	try {
		const data = await orderService.listOrders(req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Orders fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch orders failed',
			error: error.message,
		})
	}
}

const getOrderDetail = async (req, res) => {
	try {
		const { orderId } = req.params
		const data = await orderService.getOrderDetail(orderId)

		return res.status(200).json({
			success: true,
			message: 'Order detail fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch order detail failed',
			error: error.message,
		})
	}
}

const updateOrderStatus = async (req, res) => {
	try {
		const { orderId } = req.params
		const data = await orderService.updateOrderStatus(orderId, req.body || {})

		return res.status(200).json({
			success: true,
			message: 'Order updated successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Update order failed',
			error: error.message,
		})
	}
}

const updateOrderPaymentStatus = async (req, res) => {
	try {
		const { orderId } = req.params
		const data = await orderService.updateOrderPaymentStatus(orderId, req.body || {})

		return res.status(200).json({
			success: true,
			message: 'Order payment status updated successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Update payment status failed',
			error: error.message,
		})
	}
}

module.exports = {
	listOrders,
	getOrderDetail,
	updateOrderStatus,
	updateOrderPaymentStatus,
}
