import {
  signupUser,
  loginUser,
  loginAdminUser,
  getCurrentUser,
  initiatePasswordReset,
  resetPassword,
  initiateOtpReset,
  verifyOtpAndResetPassword,
  googleAuthorize,
  googleCallback,
  githubAuthorize,
  githubCallback,
  findUserByProvider,
  findOrCreateOAuthUser,
  initiateEmailVerification,
  verifyEmail
} from '../services/authService.js';
import { env } from '../config/env.js';

export const signup = async (req, res, next) => {
  try {
    const result = await signupUser(req.body);
    return res.status(201).json({ success: true, data: { user: result.user, token: result.token } });
  } catch (error) { next(error); }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    return res.status(200).json({ success: true, data: { user: result.user, token: result.token } });
  } catch (error) { next(error); }
};

export const adminLogin = async (req, res, next) => {
  try {
    const result = await loginAdminUser(req.body);
    return res.status(200).json({ success: true, data: { user: result.user, token: result.token } });
  } catch (error) { next(error); }
};

export const me = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user.id);
    return res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

// ─── JWT-based password reset (email link) ────────────────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const response = await initiatePasswordReset(req.body.email);
    return res.status(200).json({ success: true, data: response });
  } catch (error) { next(error); }
};

export const resetPasswordRequest = async (req, res, next) => {
  try {
    const response = await resetPassword(req.body.token, req.body.password);
    return res.status(200).json({ success: true, data: response });
  } catch (error) { next(error); }
};

// ─── OTP-based password reset ─────────────────────────────────────────────────
export const sendOtp = async (req, res, next) => {
  try {
    const response = await initiateOtpReset(req.body.email);
    return res.status(200).json({ success: true, data: response });
  } catch (error) { next(error); }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    }
    const response = await verifyOtpAndResetPassword(email, otp, password);
    return res.status(200).json({ success: true, data: response });
  } catch (error) { next(error); }
};

// ─── OAuth ──────────────────────────────────────────────────────────────────

export const oauthGoogleAuthorize = async (req, res, next) => {
  try {
    const { authorizationUrl } = googleAuthorize();
    return res.status(200).json({ success: true, data: { authorizationUrl } });
  } catch (error) { next(error); }
};

export const oauthGoogleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const result = await googleCallback({ code, state });
    const frontendBase = String(env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    return res.redirect(`${frontendBase}/auth-callback?token=${encodeURIComponent(result.token)}`);
  } catch (error) {
    const frontendBase = String(env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    return res.redirect(`${frontendBase}/auth-callback?error=${encodeURIComponent(error.message)}`);
  }
};

export const oauthGithubAuthorize = async (req, res, next) => {
  try {
    const { authorizationUrl } = githubAuthorize();
    return res.status(200).json({ success: true, data: { authorizationUrl } });
  } catch (error) { next(error); }
};

export const oauthGithubCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const result = await githubCallback({ code, state });
    const frontendBase = String(env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    return res.redirect(`${frontendBase}/auth-callback?token=${encodeURIComponent(result.token)}`);
  } catch (error) {
    const frontendBase = String(env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    return res.redirect(`${frontendBase}/auth-callback?error=${encodeURIComponent(error.message)}`);
  }
};

// ─── Email verification ─────────────────────────────────────────────────────

export const resendVerification = async (req, res, next) => {
  try {
    const response = await initiateEmailVerification(req.user.id);
    return res.status(200).json({ success: true, data: response });
  } catch (error) { next(error); }
};

export const verifyEmailAddress = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }
    const response = await verifyEmail(email, otp);
    return res.status(200).json({ success: true, data: response });
  } catch (error) { next(error); }
};
