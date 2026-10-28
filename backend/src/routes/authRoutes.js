const express = require('express');
const ctrl = require('../controllers/authController');
const oauth = require('../controllers/oauthController');
const { authenticate } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/signup', authLimiter, ctrl.signup);
router.post('/login', authLimiter, ctrl.login);
router.get('/oauth/providers', oauth.providers);
router.get('/oauth/:provider', authLimiter, oauth.start);
router.get('/oauth/:provider/callback', authLimiter, oauth.callback);
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
