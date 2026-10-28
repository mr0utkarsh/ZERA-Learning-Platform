import express from 'express';
import { 
  signup,
  login,
  adminLogin,
  me,
  forgotPassword,
  resetPasswordRequest,
  oauthGoogleAuthorize,
  oauthGoogleCallback,
  oauthGithubAuthorize,
  oauthGithubCallback,
  resendVerification,
  verifyEmailAddress
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  authRateLimiter,
  strictAuthRateLimiter,
  oauthRateLimiter
} from '../middleware/rateLimitMiddleware.js';
import {
  createUserSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateRequest
} from '../utils/validators.js';

const router = express.Router();

router.post('/signup', authRateLimiter, validateRequest(createUserSchema), signup);
router.post('/login', authRateLimiter, validateRequest(loginSchema), login);
router.post('/admin/login', strictAuthRateLimiter, validateRequest(loginSchema), adminLogin);
router.get('/me', authenticate, me);
router.post('/forgot-password', authRateLimiter, validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimiter, validateRequest(resetPasswordSchema), resetPasswordRequest);

router.get('/oauth/google', oauthRateLimiter, oauthGoogleAuthorize);
router.get('/oauth/google/callback', oauthRateLimiter, oauthGoogleCallback);
router.get('/oauth/github', oauthRateLimiter, oauthGithubAuthorize);
router.get('/oauth/github/callback', oauthRateLimiter, oauthGithubCallback);

router.post('/resend-verification', authenticate, authRateLimiter, resendVerification);
router.get('/verify-email', authRateLimiter, verifyEmailAddress);

export default router;
