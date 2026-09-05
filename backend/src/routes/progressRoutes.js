const express = require('express');
const { authenticate } = require('../middleware/auth');
const progressCtrl = require('../controllers/progressController');

const router = express.Router();
router.use(authenticate);

router.get('/', progressCtrl.getProgress);
router.get('/dashboard', progressCtrl.getDashboard);

module.exports = router;
