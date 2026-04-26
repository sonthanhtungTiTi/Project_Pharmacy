const addressService = require('../../services/client/address.service')

const getMyAddresses = async (req, res) => {
	try {
		const userId = req.user?.userId
		const data = await addressService.getMyAddresses(userId)

		return res.status(200).json({
			success: true,
			message: 'Addresses fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch addresses failed',
			error: error.message,
		})
	}
}

const getMyDefaultAddress = async (req, res) => {
	try {
		const userId = req.user?.userId
		const data = await addressService.getMyDefaultAddress(userId)

		return res.status(200).json({
			success: true,
			message: 'Default address fetched successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Fetch default address failed',
			error: error.message,
		})
	}
}

const createMyAddress = async (req, res) => {
	try {
		const userId = req.user?.userId
		const data = await addressService.createMyAddress(userId, req.body || {})

		return res.status(201).json({
			success: true,
			message: 'Address created successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Create address failed',
			error: error.message,
		})
	}
}

const updateMyAddress = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { addressId } = req.params
		const data = await addressService.updateMyAddress(userId, addressId, req.body || {})

		return res.status(200).json({
			success: true,
			message: 'Address updated successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Update address failed',
			error: error.message,
		})
	}
}

const setMyDefaultAddress = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { addressId } = req.params
		const data = await addressService.setMyDefaultAddress(userId, addressId)

		return res.status(200).json({
			success: true,
			message: 'Default address updated successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Set default address failed',
			error: error.message,
		})
	}
}

const deleteMyAddress = async (req, res) => {
	try {
		const userId = req.user?.userId
		const { addressId } = req.params
		const data = await addressService.deleteMyAddress(userId, addressId)

		return res.status(200).json({
			success: true,
			message: 'Address deleted successfully',
			data,
		})
	} catch (error) {
		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || 'Delete address failed',
			error: error.message,
		})
	}
}

module.exports = {
	getMyAddresses,
	getMyDefaultAddress,
	createMyAddress,
	updateMyAddress,
	setMyDefaultAddress,
	deleteMyAddress,
}
