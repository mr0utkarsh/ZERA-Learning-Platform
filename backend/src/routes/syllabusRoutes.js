const express = require('express');
const ctrl = require('../controllers/syllabusController');
const { authenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
router.use(authenticate);

router.post('/upload', aiLimiter, ctrl.upload.single('syllabus'), ctrl.uploadAndAnalyze);
router.post('/confirm', ctrl.confirmStructure);

module.exports = router;
