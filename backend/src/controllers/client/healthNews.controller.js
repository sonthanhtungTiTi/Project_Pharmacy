const healthNewsService = require('../../services/client/healthNews.service')

const getAllHealthNews = async (req, res) => {
	try {
		const newsList = await healthNewsService.getAllHealthNews()
		res.json(newsList)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
}

const getHealthNewsById = async (req, res) => {
	try {
		const { newsId } = req.params
		const news = await healthNewsService.getHealthNewsById(newsId)
		res.json(news)
	} catch (error) {
		res.status(404).json({ message: error.message })
	}
}

const createHealthNews = async (req, res) => {
	try {
		const newsData = req.body
		const news = await healthNewsService.createHealthNews(newsData)
		res.status(201).json(news)
	} catch (error) {
		res.status(400).json({ message: error.message })
	}
}

const updateHealthNews = async (req, res) => {
	try {
		const { newsId } = req.params
		const newsData = req.body
		const news = await healthNewsService.updateHealthNews(newsId, newsData)
		res.json(news)
	} catch (error) {
		res.status(400).json({ message: error.message })
	}
}

const deleteHealthNews = async (req, res) => {
	try {
		const { newsId } = req.params
		const news = await healthNewsService.deleteHealthNews(newsId)
		res.json(news)
	} catch (error) {
		res.status(404).json({ message: error.message })
	}
}

module.exports = {
	getAllHealthNews,
	getHealthNewsById,
	createHealthNews,
	updateHealthNews,
	deleteHealthNews,
}
