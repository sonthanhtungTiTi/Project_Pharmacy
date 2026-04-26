const express = require('express')
const healthNewsController = require('../../controllers/client/healthNews.controller')

const router = express.Router()

router.get('/', healthNewsController.getAllHealthNews)
router.get('/:newsId', healthNewsController.getHealthNewsById)
router.post('/', healthNewsController.createHealthNews)
router.put('/:newsId', healthNewsController.updateHealthNews)
router.delete('/:newsId', healthNewsController.deleteHealthNews)

module.exports = router
