const inventoryService = require('../../services/admin/inventory.service')

const listInventory = async (req, res) => {
	try {
		const data = await inventoryService.listInventory(req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Inventory fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch inventory failed',
		})
	}
}

const getProductInventory = async (req, res) => {
	try {
		const { productId } = req.params
		const data = await inventoryService.getProductInventory(productId)

		return res.status(200).json({
			success: true,
			message: 'Product inventory fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch product inventory failed',
		})
	}
}

const importBatch = async (req, res) => {
	try {
		const { productId } = req.params
		const data = await inventoryService.importBatch(productId, req.body)

		return res.status(201).json({
			success: true,
			message: 'Nhập lô hàng thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Import batch failed',
		})
	}
}

const adjustBatchQuantity = async (req, res) => {
	try {
		const { productId, batchNumber } = req.params
		const data = await inventoryService.adjustBatchQuantity(productId, batchNumber, req.body)

		return res.status(200).json({
			success: true,
			message: 'Điều chỉnh số lượng thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Adjust quantity failed',
		})
	}
}

const removeBatch = async (req, res) => {
	try {
		const { productId, batchNumber } = req.params
		const data = await inventoryService.removeBatch(productId, batchNumber)

		return res.status(200).json({
			success: true,
			message: 'Xóa lô hàng thành công',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Remove batch failed',
		})
	}
}

const getExpiringBatches = async (req, res) => {
	try {
		const data = await inventoryService.getExpiringBatches(req.query || {})

		return res.status(200).json({
			success: true,
			message: 'Expiring batches fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch expiring batches failed',
		})
	}
}

const getInventoryOverview = async (req, res) => {
	try {
		const data = await inventoryService.getInventoryOverview()

		return res.status(200).json({
			success: true,
			message: 'Inventory overview fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch inventory overview failed',
		})
	}
}

module.exports = {
	listInventory,
	getProductInventory,
	importBatch,
	adjustBatchQuantity,
	removeBatch,
	getExpiringBatches,
	getInventoryOverview,
}
