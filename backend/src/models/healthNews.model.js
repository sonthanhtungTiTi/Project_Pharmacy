const mongoose = require('mongoose')

const healthNewsSchema = new mongoose.Schema(
	{
		newsId: {
			type: String,
			required: true,
			unique: true,
		},
		title: {
			type: String,
			required: true,
		},
		summary: {
			type: String,
			required: true,
		},
		author: {
			type: String,
			required: true,
		},
		heroImage: {
			type: String,
			required: true,
		},
		updatedAt: {
			type: String,
			required: true,
		},
		views: {
			type: Number,
			default: 0,
		},
		sections: [
			{
				heading: String,
				paragraphs: [String],
				bullets: [String],
				image: String,
				imageCaption: String,
			},
		],
		related: [
			{
				id: String,
				title: String,
				date: String,
				image: String,
			},
		],
	},
	{ timestamps: true }
)

const HealthNews = mongoose.model('HealthNews', healthNewsSchema)

module.exports = HealthNews
