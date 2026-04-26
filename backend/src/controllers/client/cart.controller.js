const cartService = require('../../services/client/cart.service')

const getCart = async (req, res) => {
	try {
		const userId = req.user?.userId
		const data = await cartService.getCartByUserId(userId)

		return res.status(200).json({
			success: true,
			message: 'Cart fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch cart failed',
			error: error.message,
		})
	}
}

const addCartItem = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { productId, quantity } = req.body || {}
		const data = await cartService.addItemToCart(userId, { productId, quantity })

		return res.status(200).json({
			success: true,
			message: 'Item added to cart',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Add item failed',
			error: error.message,
		})
	}
}

const updateCartItem = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { productId } = req.params
		const { quantity } = req.body || {}
		const data = await cartService.updateCartItemQuantity(userId, productId, quantity)

		return res.status(200).json({
			success: true,
			message: 'Cart item updated',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Update item failed',
			error: error.message,
		})
	}
}

const deleteCartItem = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { productId } = req.params
		const data = await cartService.removeCartItem(userId, productId)

		return res.status(200).json({
			success: true,
			message: 'Cart item removed',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Remove item failed',
			error: error.message,
		})
	}
}

const clearCart = async (req, res) => {
	try {
		const userId = req.user?.userId
		const data = await cartService.clearCart(userId)

		return res.status(200).json({
			success: true,
			message: 'Cart cleared',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Clear cart failed',
			error: error.message,
		})
	}
}

module.exports = {
	getCart,
	addCartItem,
	updateCartItem,
	deleteCartItem,
	clearCart,
}
