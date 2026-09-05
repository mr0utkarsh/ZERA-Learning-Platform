const express = require('express');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/signup', authLimiter, ctrl.signup);
router.post('/login', authLimiter, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);

router.post('/verify-email', authenticate, otpLimiter, ctrl.verifyEmailOtp);
router.post('/resend-email-otp', authenticate, otpLimiter, ctrl.resendEmailOtp);

router.post('/forgot-password', otpLimiter, ctrl.forgotPassword);
router.post('/verify-reset-otp', otpLimiter, ctrl.verifyResetOtp);
router.post('/reset-password', authLimiter, ctrl.resetPassword);

// Accept an admin invitation (invitee sets their password, then awaits approval).
router.post('/accept-admin-invite', otpLimiter, ctrl.acceptAdminInvite);

module.exports = router;
