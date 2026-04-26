const express = require('express')

const chatController = require('../../controllers/client/chat.controller')
const { authenticateClientJwt } = require('../../middleware/auth.middleware')

const router = express.Router()

router.use(authenticateClientJwt)

router.get('/conversation', chatController.getMyConversation)
router.get('/messages', chatController.getMyMessages)
router.post('/agent', chatController.handleChatWithAI)
router.post('/message', chatController.sendMessage)
router.post('/request-human', chatController.requestHumanSupport)

module.exports = router
