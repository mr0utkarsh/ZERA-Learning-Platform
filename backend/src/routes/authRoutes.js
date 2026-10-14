import express from 'express';
import {
  signup,
  login,
  adminLogin,
  me,
  forgotPassword,
  resetPasswordRequest,
  sendOtp,
  verifyOtp
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  createUserSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  otpSendSchema,
  otpVerifySchema,
  validateRequest
} from '../utils/validators.js';

const router = express.Router();

// ─── Public auth routes ───────────────────────────────────────────────────────
router.post('/signup', validateRequest(createUserSchema), signup);
router.post('/login', validateRequest(loginSchema), login);
router.post('/admin/login', validateRequest(loginSchema), adminLogin);

// ─── JWT-based password reset (link in email) ─────────────────────────────────
router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPasswordRequest);

// ─── OTP-based password reset ─────────────────────────────────────────────────
router.post('/send-otp', validateRequest(otpSendSchema), sendOtp);
router.post('/verify-otp', validateRequest(otpVerifySchema), verifyOtp);

// ─── Authenticated route ──────────────────────────────────────────────────────
router.get('/me', authenticate, me);

export default router;
