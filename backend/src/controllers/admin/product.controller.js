const productService = require('../../services/admin/product.service')

const listProducts = async (req, res) => {
	try {
		const data = await productService.listProducts(req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Products fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch products failed',
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
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch product failed',
		})
	}
}

const createProduct = async (req, res) => {
	try {
		const data = await productService.createProduct(req.body)

		return res.status(201).json({
			success: true,
			message: 'Tạo sản phẩm thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Create product failed',
		})
	}
}

const updateProduct = async (req, res) => {
	try {
		const { productId, id } = req.params
		const targetId = productId || id
		const data = await productService.updateProduct(targetId, req.body)

		return res.status(200).json({
			success: true,
			message: 'Cập nhật sản phẩm thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Update product failed',
		})
	}
}

const deleteProduct = async (req, res) => {
	try {
		const { productId } = req.params
		const data = await productService.deleteProduct(productId)

		return res.status(200).json({
			success: true,
			message: 'Xóa sản phẩm thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Delete product failed',
		})
	}
}

const addInventoryBatch = async (req, res) => {
	try {
		const { productId } = req.params
		const data = await productService.addInventoryBatch(productId, req.body)

		return res.status(201).json({
			success: true,
			message: 'Thêm lô hàng thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Add inventory batch failed',
		})
	}
}

module.exports = {
	listProducts,
	getProductDetail,
	createProduct,
	updateProduct,
	deleteProduct,
	addInventoryBatch,
}
