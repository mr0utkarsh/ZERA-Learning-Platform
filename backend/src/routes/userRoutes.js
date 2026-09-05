const express = require('express');
const ctrl = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.patch('/profile', ctrl.updateProfile);
router.post('/change-password', ctrl.changePassword);

module.exports = router;
