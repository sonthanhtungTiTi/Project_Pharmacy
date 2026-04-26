const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema(
	{
		categoryName: {
			type: String,
			required: true,
			trim: true,
		},
		parentId: {
			type: mongoose.Schema.Types.Mixed,
			default: null,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
		collection: 'categories',
	},
)

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema)
