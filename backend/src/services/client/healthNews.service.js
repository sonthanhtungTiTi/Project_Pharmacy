const HealthNews = require('../../models/healthNews.model')

const getAllHealthNews = async () => {
	try {
		const newsList = await HealthNews.find().sort({ newsId: 1 })
		return newsList
	} catch (error) {
		throw new Error(`Failed to fetch health news: ${error.message}`)
	}
}

const getHealthNewsById = async (newsId) => {
	try {
		const news = await HealthNews.findOne({ newsId })
		if (!news) {
			throw new Error('Health news not found')
		}
		return news
	} catch (error) {
		throw new Error(`Failed to fetch health news: ${error.message}`)
	}
}

const createHealthNews = async (newsData) => {
	try {
		const news = new HealthNews(newsData)
		await news.save()
		return news
	} catch (error) {
		throw new Error(`Failed to create health news: ${error.message}`)
	}
}

const updateHealthNews = async (newsId, newsData) => {
	try {
		const news = await HealthNews.findOneAndUpdate({ newsId }, newsData, {
			new: true,
			runValidators: true,
		})
		if (!news) {
			throw new Error('Health news not found')
		}
		return news
	} catch (error) {
		throw new Error(`Failed to update health news: ${error.message}`)
	}
}

const deleteHealthNews = async (newsId) => {
	try {
		const news = await HealthNews.findOneAndDelete({ newsId })
		if (!news) {
			throw new Error('Health news not found')
		}
		return news
	} catch (error) {
		throw new Error(`Failed to delete health news: ${error.message}`)
	}
}

module.exports = {
	getAllHealthNews,
	getHealthNewsById,
	createHealthNews,
	updateHealthNews,
	deleteHealthNews,
}
