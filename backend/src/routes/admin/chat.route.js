const express = require('express')

const chatController = require('../../controllers/admin/chat.controller')
const { authorizeStaff } = require('../../middleware/auth.middleware')

const router = express.Router()

router.use(authorizeStaff)

router.get('/conversations', chatController.getConversations)
router.get('/conversations/:conversationId/messages', chatController.getConversationMessages)
router.patch('/conversations/:conversationId/join', chatController.joinConversation)
router.patch('/conversations/:conversationId/close', chatController.closeConversation)

module.exports = router
