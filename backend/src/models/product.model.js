const mongoose = require('mongoose')

const inventoryItemSchema = new mongoose.Schema(
	{
		batchNumber: {
			type: String,
			required: true,
		},
		baseQuantity: {
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
			type: mongoose.Schema.Types.ObjectId,
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
		baseUnit: {
			type: String,
			required: true,
			default: 'pill' // e.g., pill, ml, bottle
		},
		units: {
			type: Map,
			of: Number,
			default: {}
		},
		sellUnits: {
			type: Map,
			of: new mongoose.Schema({
				price: { type: Number, required: true, min: 0 }
			}, { _id: false }),
			default: {}
		},
		defaultSellUnit: {
			type: String,
			required: true,
			default: 'box'
		},
		totalBaseQuantity: {
			type: Number,
			default: 0
		},
		usageSummary: String,
		mainIngredients: String,
		targetUsers: String,
		brand: String,
		manufacturer: String,
		ingredients: String,
		usage: String,
		dosage: String,
		contraindications: String,
		sideEffects: String,
		precautions: String,
		pharmacology: String,
		additionalInfo: String,
		storage: String,
		packaging: String,
		expiry: String,
		manufacturerDetail: String,
		characteristics: String,
		images: [String],
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
		toJSON: {
			transform: function (doc, ret) {
				Object.keys(ret).forEach(key => {
					if (ret[key] === '' || ret[key] === null) {
						delete ret[key]
					}
				})
				return ret
			}
		},
		toObject: {
			transform: function (doc, ret) {
				Object.keys(ret).forEach(key => {
					if (ret[key] === '' || ret[key] === null) {
						delete ret[key]
					}
				})
				return ret
			}
		}
	},
)

// Pre-save hook for validation, auto-parsing, and inventory sync
productSchema.pre('save', function (next) {
	// 1. Validate sellUnits against units
	if (this.units && this.sellUnits) {
		const unitKeys = Array.from(this.units.keys())
		const sellKeys = Array.from(this.sellUnits.keys())

		for (const key of sellKeys) {
			if (!unitKeys.includes(key) && key !== this.baseUnit) {
				return next(new Error(`Sell unit '${key}' không có trong units`))
			}
		}
	}

	// 2. Validate defaultSellUnit exists in sellUnits
	if (this.defaultSellUnit && (!this.sellUnits || !this.sellUnits.has(this.defaultSellUnit))) {
		return next(new Error('defaultSellUnit không tồn tại trong sellUnits'))
	}

	// 3. Validate unit values > 0
	if (this.units) {
		for (const [key, value] of this.units.entries()) {
			if (value <= 0) {
				return next(new Error(`Unit '${key}' phải > 0`))
			}
		}
	}

	// 4. Sync totalBaseQuantity and Validate unique batchNumber
	if (this.inventory && this.inventory.length > 0) {
		const batchSet = new Set()
		let total = 0
		
		for (const item of this.inventory) {
			if (batchSet.has(item.batchNumber)) {
				return next(new Error(`Trùng batchNumber: ${item.batchNumber}`))
			}
			batchSet.add(item.batchNumber)
			total += (item.baseQuantity || 0)
		}
		
		this.totalBaseQuantity = total
	} else {
		this.totalBaseQuantity = 0
	}

	// 5. Parse packaging to generate units if applicable
	if (this.packaging && (!this.units || this.units.size === 0)) {
		const pkg = this.packaging.toLowerCase()
		
		const boxMatch = pkg.match(/hộp\s+(\d+)\s+vỉ\s*(?:x\s*|nhân\s*|-)?\s*(\d+)\s*viên/i)
		if (boxMatch) {
			const vi = parseInt(boxMatch[1], 10)
			const vien = parseInt(boxMatch[2], 10)
			this.units.set('blister', vien)
			this.units.set('box', vi * vien)
		} else if (pkg.includes('vỉ')) {
			const viMatch = pkg.match(/vỉ\s+(\d+)\s*viên/i)
			if (viMatch) {
				this.units.set('blister', parseInt(viMatch[1], 10))
			} else {
				this.units.set('blister', 10)
			}
		}
	}
	
	next()
})

// Add indexes for better query performance
productSchema.index({ isActive: 1 })
productSchema.index({ categoryId: 1 })
productSchema.index({ 'inventory.expiryDate': 1 })
productSchema.index({ totalBaseQuantity: 1 })
productSchema.index({ productName: 'text', medicineName: 'text' })

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema)
