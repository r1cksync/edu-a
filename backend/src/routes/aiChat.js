const express = require('express');
const aiChatController = require('../controllers/aiChatController_test');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/ai-chat - Chat with AI about test attempt
router.post('/', aiChatController.chatWithAI);

module.exports = router;