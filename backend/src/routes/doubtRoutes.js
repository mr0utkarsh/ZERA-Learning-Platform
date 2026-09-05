const express = require('express');
const ctrl = require('../controllers/doubtController');
const { authenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
router.use(authenticate);

router.get('/conversations', ctrl.listConversations);
router.get('/conversations/:id', ctrl.getConversation);
router.delete('/conversations/:id', ctrl.deleteConversation);
router.post('/ask', aiLimiter, ctrl.ask);

module.exports = router;
