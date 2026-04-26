const mongoose = require('mongoose')

const Address = require('../../models/address.model')

class AddressServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

const normalizeText = (value) => String(value || '').trim()

const toFullAddress = (addressDoc) => {
	const parts = [
		normalizeText(addressDoc.street),
		normalizeText(addressDoc.wardName),
		normalizeText(addressDoc.districtName),
		normalizeText(addressDoc.provinceName),
	].filter(Boolean)

	return parts.join(', ')
}

const serializeAddress = (addressDoc) => ({
	id: String(addressDoc._id),
	userId: String(addressDoc.userId),
	label: addressDoc.label || 'other',
	recipientName: addressDoc.recipientName,
	phone: addressDoc.phone,
	provinceCode: addressDoc.provinceCode || '',
	provinceName: addressDoc.provinceName,
	districtCode: addressDoc.districtCode || '',
	districtName: addressDoc.districtName,
	wardCode: addressDoc.wardCode || '',
	wardName: addressDoc.wardName,
	street: addressDoc.street,
	note: addressDoc.note || '',
	isDefault: Boolean(addressDoc.isDefault),
	fullAddress: toFullAddress(addressDoc),
	createdAt: addressDoc.createdAt,
	updatedAt: addressDoc.updatedAt,
})

const ensureValidObjectId = (value, fieldName) => {
	if (!mongoose.Types.ObjectId.isValid(value)) {
		throw new AddressServiceError(`${fieldName} is invalid`, 400)
	}
}

const validateAddressPayload = (payload = {}) => {
	const requiredFields = ['recipientName', 'phone', 'provinceName', 'districtName', 'wardName', 'street']

	for (const field of requiredFields) {
		if (!normalizeText(payload[field])) {
			throw new AddressServiceError(`${field} is required`, 400)
		}
	}

	return {
		label: ['home', 'office', 'other'].includes(payload.label) ? payload.label : 'other',
		recipientName: normalizeText(payload.recipientName),
		phone: normalizeText(payload.phone),
		provinceCode: normalizeText(payload.provinceCode),
		provinceName: normalizeText(payload.provinceName),
		districtCode: normalizeText(payload.districtCode),
		districtName: normalizeText(payload.districtName),
		wardCode: normalizeText(payload.wardCode),
		wardName: normalizeText(payload.wardName),
		street: normalizeText(payload.street),
		note: normalizeText(payload.note),
		isDefault: Boolean(payload.isDefault),
	}
}

const getMyAddresses = async (userId) => {
	ensureValidObjectId(userId, 'userId')

	const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 })
	return addresses.map(serializeAddress)
}

const getMyDefaultAddress = async (userId) => {
	ensureValidObjectId(userId, 'userId')

	const address = await Address.findOne({ userId, isDefault: true }).sort({ updatedAt: -1 })
	return address ? serializeAddress(address) : null
}

const createMyAddress = async (userId, payload = {}) => {
	ensureValidObjectId(userId, 'userId')

	const addressPayload = validateAddressPayload(payload)
	const existingCount = await Address.countDocuments({ userId })
	const shouldSetDefault = addressPayload.isDefault || existingCount === 0

	if (shouldSetDefault) {
		await Address.updateMany({ userId, isDefault: true }, { isDefault: false })
	}

	const address = await Address.create({
		...addressPayload,
		userId,
		isDefault: shouldSetDefault,
	})

	return serializeAddress(address)
}

const updateMyAddress = async (userId, addressId, payload = {}) => {
	ensureValidObjectId(userId, 'userId')
	ensureValidObjectId(addressId, 'addressId')

	const address = await Address.findOne({ _id: addressId, userId })
	if (!address) {
		throw new AddressServiceError('Address not found', 404)
	}

	const mergedPayload = {
		label: payload.label ?? address.label,
		recipientName: payload.recipientName ?? address.recipientName,
		phone: payload.phone ?? address.phone,
		provinceCode: payload.provinceCode ?? address.provinceCode,
		provinceName: payload.provinceName ?? address.provinceName,
		districtCode: payload.districtCode ?? address.districtCode,
		districtName: payload.districtName ?? address.districtName,
		wardCode: payload.wardCode ?? address.wardCode,
		wardName: payload.wardName ?? address.wardName,
		street: payload.street ?? address.street,
		note: payload.note ?? address.note,
		isDefault: payload.isDefault ?? address.isDefault,
	}

	const nextAddress = validateAddressPayload(mergedPayload)

	if (nextAddress.isDefault) {
		await Address.updateMany(
			{ userId, _id: { $ne: address._id }, isDefault: true },
			{ isDefault: false },
		)
	}

	Object.assign(address, nextAddress)
	await address.save()

	return serializeAddress(address)
}

const setMyDefaultAddress = async (userId, addressId) => {
	ensureValidObjectId(userId, 'userId')
	ensureValidObjectId(addressId, 'addressId')

	const address = await Address.findOne({ _id: addressId, userId })
	if (!address) {
		throw new AddressServiceError('Address not found', 404)
	}

	await Address.updateMany({ userId, isDefault: true }, { isDefault: false })
	address.isDefault = true
	await address.save()

	return serializeAddress(address)
}

const deleteMyAddress = async (userId, addressId) => {
	ensureValidObjectId(userId, 'userId')
	ensureValidObjectId(addressId, 'addressId')

	const address = await Address.findOne({ _id: addressId, userId })
	if (!address) {
		throw new AddressServiceError('Address not found', 404)
	}

	const wasDefault = address.isDefault
	await Address.deleteOne({ _id: address._id })

	if (wasDefault) {
		const latestAddress = await Address.findOne({ userId }).sort({ createdAt: -1 })
		if (latestAddress) {
			latestAddress.isDefault = true
			await latestAddress.save()
		}
	}

	return { deleted: true }
}

module.exports = {
	AddressServiceError,
	getMyAddresses,
	getMyDefaultAddress,
	createMyAddress,
	updateMyAddress,
	setMyDefaultAddress,
	deleteMyAddress,
}
