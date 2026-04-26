const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema(
	{
		productId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},
		medicineCode: {
			type: String,
			default: '',
		},
		productName: {
			type: String,
			required: true,
			trim: true,
		},
		productImage: {
			type: String,
			default: '',
		},
		unitPrice: {
			type: Number,
			required: true,
			min: 0,
		},
		quantity: {
			type: Number,
			required: true,
			min: 1,
		},
		lineTotal: {
			type: Number,
			required: true,
			min: 0,
		},
	},
	{ _id: false },
)

const shippingAddressSchema = new mongoose.Schema(
	{
		addressId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Address',
			required: true,
		},
		label: {
			type: String,
			default: 'other',
		},
		recipientName: {
			type: String,
			required: true,
			trim: true,
		},
		phone: {
			type: String,
			required: true,
			trim: true,
		},
		provinceName: {
			type: String,
			required: true,
			trim: true,
		},
		districtName: {
			type: String,
			required: true,
			trim: true,
		},
		wardName: {
			type: String,
			required: true,
			trim: true,
		},
		street: {
			type: String,
			required: true,
			trim: true,
		},
		note: {
			type: String,
			default: '',
			trim: true,
		},
		fullAddress: {
			type: String,
			required: true,
			trim: true,
		},
	},
	{ _id: false },
)

const orderSchema = new mongoose.Schema(
	{
		orderCode: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		shippingAddress: {
			type: shippingAddressSchema,
			required: true,
		},
		items: {
			type: [orderItemSchema],
			required: true,
			default: [],
		},
		totalQuantity: {
			type: Number,
			required: true,
			min: 1,
		},
		totalAmount: {
			type: Number,
			required: true,
			min: 0,
		},
		status: {
			type: String,
			enum: ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'],
			default: 'pending',
			index: true,
		},
		paymentMethod: {
			type: String,
			enum: ['cod', 'bank_transfer', 'e_wallet', 'momo'],
			default: 'cod',
		},
		paymentStatus: {
			type: String,
			enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'],
			default: 'unpaid',
		},
		transactionId: {
			type: String,
			default: null,
		},
		paymentDate: {
			type: Date,
			default: null,
		},
		note: {
			type: String,
			default: '',
			trim: true,
		},
		adminNote: {
			type: String,
			default: '',
			trim: true,
		},
		cancelReason: {
			type: String,
			default: '',
			trim: true,
		},
		placedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{
		timestamps: true,
	},
)

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema)
