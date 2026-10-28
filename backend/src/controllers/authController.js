import {
  signupUser,
  loginUser,
  loginAdminUser,
  getCurrentUser,
  initiatePasswordReset,
  resetPassword,
  googleAuthorize,
  googleCallback,
  githubAuthorize,
  githubCallback,
  initiateEmailVerification,
  verifyEmail
} from '../services/authService.js';
import { env } from '../config/env.js';

export const signup = async (req, res, next) => {
  try {
    const result = await signupUser(req.body);
    return res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const adminLogin = async (req, res, next) => {
  try {
    const result = await loginAdminUser(req.body);
    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user.id);
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const response = await initiatePasswordReset(req.body.email);
    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordRequest = async (req, res, next) => {
  try {
    const response = await resetPassword(req.body.token, req.body.password);
    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

export const oauthGoogleAuthorize = async (req, res, next) => {
  try {
    const { authorizationUrl } = googleAuthorize();
    return res.status(200).json({ success: true, data: { authorizationUrl } });
  } catch (error) {
    next(error);
  }
};

export const oauthGoogleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const result = await googleCallback({ code, state });
    const frontendBase = String(env.FRONTEND_URL || env.CLIENT_URL || 'http://localhost:8000').replace(/\/$/, '');
    return res.redirect(`${frontendBase}/auth-callback.html?token=${encodeURIComponent(result.token)}`);
  } catch (error) {
    next(error);
  }
};

export const oauthGithubAuthorize = async (req, res, next) => {
  try {
    const { authorizationUrl } = githubAuthorize();
    return res.status(200).json({ success: true, data: { authorizationUrl } });
  } catch (error) {
    next(error);
  }
};

export const oauthGithubCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const result = await githubCallback({ code, state });
    const frontendBase = String(env.FRONTEND_URL || env.CLIENT_URL || 'http://localhost:8000').replace(/\/$/, '');
    return res.redirect(`${frontendBase}/auth-callback.html?token=${encodeURIComponent(result.token)}`);
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const response = await initiateEmailVerification(req.user.id);
    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailAddress = async (req, res, next) => {
  try {
    const response = await verifyEmail(req.query.token);
    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};
