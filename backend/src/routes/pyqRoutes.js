const express = require('express');
const ctrl = require('../controllers/pyqController');
const { authenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/bookmarks', ctrl.listBookmarks);
router.post('/:id/attempt', ctrl.attempt);
router.get('/:id/solution', ctrl.getSolution);
router.post('/:id/bookmark', ctrl.toggleBookmark);
router.post('/:id/explain', aiLimiter, ctrl.explain);

module.exports = router;
