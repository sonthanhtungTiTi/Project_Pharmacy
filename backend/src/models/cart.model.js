const mongoose = require('mongoose')

const cartItemSchema = new mongoose.Schema(
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
			default: 1,
		},
	},
	{
		_id: false,
	},
)

const cartSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			unique: true,
			index: true,
		},
		items: {
			type: [cartItemSchema],
			default: [],
		},
	},
	{
		timestamps: true,
	},
)

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema)
