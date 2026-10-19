<<<<<<< HEAD
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
=======
import express from 'express';
import { 
  signup,
  login,
  adminLogin,
  me,
  forgotPassword,
  resetPasswordRequest,
  requestOtp,
  verifyOtp
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  createUserSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  validateRequest
} from '../utils/validators.js';

const router = express.Router();

router.post('/signup', validateRequest(createUserSchema), signup);
router.post('/login', validateRequest(loginSchema), login);
router.post('/admin/login', validateRequest(loginSchema), adminLogin);
router.get('/me', authenticate, me);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/request-otp', validateRequest(forgotPasswordSchema), requestOtp);
router.post('/verify-otp', validateRequest(verifyOtpSchema), verifyOtp);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPasswordRequest);

export default router;
>>>>>>> 4804780593c11e68ae22b39c559dc624c40d29a7
