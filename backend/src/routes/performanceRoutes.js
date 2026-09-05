const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/performanceController');

const router = express.Router();
router.use(authenticate);
router.get('/', ctrl.getPerformance);

module.exports = router;
