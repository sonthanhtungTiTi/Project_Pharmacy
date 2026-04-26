const mongoose = require('mongoose')

const inventoryItemSchema = new mongoose.Schema(
	{
		batchNumber: {
			type: String,
			required: true,
		},
		quantity: {
			type: Number,
			required: true,
			min: 0,
		},
		expiryDate: {
			type: Date,
			required: true,
		},
		importPrice: {
			type: Number,
			required: true,
		},
	},
	{ _id: false },
)

const productSchema = new mongoose.Schema(
	{
		medicineCode: {
			type: String,
			required: true,
			unique: true,
		},
		categoryId: {
			type: mongoose.Schema.Types.Mixed,
			ref: 'Category',
			required: true,
		},
		categoryName: {
			type: String,
			required: true,
		},
		productName: {
			type: String,
			required: true,
		},
		price: {
			type: Number,
			required: true,
			min: 0,
		},
		usageSummary: {
			type: String,
			default: '',
		},
		mainIngredients: {
			type: String,
			default: '',
		},
		targetUsers: {
			type: String,
			default: '',
		},
		brand: {
			type: String,
			default: '',
		},
		manufacturer: {
			type: String,
			default: '',
		},
		ingredients: {
			type: String,
			default: '',
		},
		usage: {
			type: String,
			default: '',
		},
		dosage: {
			type: String,
			default: '',
		},
		contraindications: {
			type: String,
			default: '',
		},
		sideEffects: {
			type: String,
			default: '',
		},
		precautions: {
			type: String,
			default: '',
		},
		pharmacology: {
			type: String,
			default: '',
		},
		additionalInfo: {
			type: String,
			default: '',
		},
		storage: {
			type: String,
			default: '',
		},
		packaging: {
			type: String,
			default: '',
		},
		expiry: {
			type: String,
			default: '',
		},
		manufacturerDetail: {
			type: String,
			default: '',
		},
		characteristics: {
			type: String,
			default: '',
		},
		images: {
			type: String,
			default: '',
		},
		activeIngredient: String,
		medicineName: String,
		unit: String,
		requiresPrescription: {
			type: Boolean,
			default: false,
		},
		inventory: [inventoryItemSchema],
		supplierId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Supplier',
		},
		description: String,
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
		collection: 'products',
	},
)

// Add indexes for better query performance
productSchema.index({ isActive: 1 })
productSchema.index({ categoryId: 1 })
productSchema.index({ productName: 'text', medicineName: 'text' })

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema)
