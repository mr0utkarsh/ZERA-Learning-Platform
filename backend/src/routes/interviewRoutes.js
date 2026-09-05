const express = require('express');
const ctrl = require('../controllers/interviewController');
const { authenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
router.use(authenticate);

router.post('/start', aiLimiter, ctrl.start);
router.get('/', ctrl.listSessions);
router.get('/:id', ctrl.getSession);
router.post('/:sessionId/answer', aiLimiter, ctrl.answer);

module.exports = router;
