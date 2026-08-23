import {
  signupUser,
  loginUser,
  loginAdminUser,
  getCurrentUser,
  initiatePasswordReset,
  resetPassword
} from '../services/authService.js';

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
