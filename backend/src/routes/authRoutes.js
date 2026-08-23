import express from 'express';
import { 
  signup,
  login,
  adminLogin,
  me,
  forgotPassword,
  resetPasswordRequest
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  createUserSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateRequest
} from '../utils/validators.js';

const router = express.Router();

router.post('/signup', validateRequest(createUserSchema), signup);
router.post('/login', validateRequest(loginSchema), login);
router.post('/admin/login', validateRequest(loginSchema), adminLogin);
router.get('/me', authenticate, me);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPasswordRequest);

export default router;
