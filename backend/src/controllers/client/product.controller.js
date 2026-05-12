const productService = require('../../services/client/product.service')

const listProducts = async (req, res) => {
	try {
		const data = await productService.getProducts(req.query)

		return res.status(200).json({
			success: true,
			message: 'Products fetched successfully',
			data,
		})
	} catch (error) {
		const statusCode = error.statusCode || 500

		return res.status(statusCode).json({
			success: false,
			message: error.message || 'Fetch products failed',
			error: error.message,
		})
	}
}

const searchProducts = async (req, res) => {
	try {
		const data = await productService.searchProductsByKeyword(req.query)

		return res.status(200).json({
			success: true,
			message: 'Product search completed',
			data,
		})
	} catch (error) {
		const statusCode = error.statusCode || 500

		return res.status(statusCode).json({
			success: false,
			message: error.message || 'Search products failed',
			error: error.message,
		})
	}
}

const getProductDetail = async (req, res) => {
	try {
		const { productId } = req.params
		const data = await productService.getProductDetail(productId)

		return res.status(200).json({
			success: true,
			message: 'Product fetched successfully',
			data,
		})
	} catch (error) {
		const statusCode = error.statusCode || 500

		return res.status(statusCode).json({
			success: false,
			message: error.message || 'Fetch product failed',
			error: error.message,
		})
	}
}

const searchProductsByImage = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'No image file uploaded',
			})
		}

		const data = await productService.searchProductsByImage(req.file.buffer)

		return res.status(200).json({
			success: true,
			message: 'Products found by image',
			data,
		})
	} catch (error) {
		const statusCode = error.statusCode || 500

		return res.status(statusCode).json({
			success: false,
			message: error.message || 'Image search failed',
			error: error.message,
		})
	}
}

module.exports = {
	listProducts,
	searchProducts,
	getProductDetail,
	searchProductsByImage,
}
