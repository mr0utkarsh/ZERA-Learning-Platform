const express = require('express');
const ctrl = require('../controllers/contactController');
const { authLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
router.post('/', authLimiter, ctrl.submitContact);

module.exports = router;
