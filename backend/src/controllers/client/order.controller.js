const orderService = require('../../services/client/order.service')

const checkoutFromCart = async (req, res) => {
	try {
		const userId = req.user?.userId
		const data = await orderService.checkoutFromCart(userId, req.body || {})

		return res.status(201).json({
			success: true,
			message: 'Order created successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Checkout failed',
			error: error.message,
		})
	}
}

const getMyOrders = async (req, res) => {
	try {
		const userId = req.user?.userId
		const data = await orderService.getMyOrders(userId, req.query || {})

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

const getMyOrderDetail = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { orderId } = req.params
		const data = await orderService.getMyOrderDetail(userId, orderId)

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

const cancelMyOrder = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { orderId } = req.params
		const data = await orderService.cancelMyOrder(userId, orderId, req.body || {})

		return res.status(200).json({
			success: true,
			message: 'Order cancelled successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Cancel order failed',
			error: error.message,
		})
	}
}

module.exports = {
	checkoutFromCart,
	getMyOrders,
	getMyOrderDetail,
	cancelMyOrder,
}
