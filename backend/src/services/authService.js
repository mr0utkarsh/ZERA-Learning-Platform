import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { emailService } from './emailService.js';

export const sanitizeUser = (user) => {
  if (!user) return null;

  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

export const createAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

export const createPasswordResetToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      purpose: 'password_reset'
    },
    env.PASSWORD_RESET_TOKEN_SECRET,
    { expiresIn: env.PASSWORD_RESET_TOKEN_EXPIRES_IN }
  );
};

export const verifyPasswordResetToken = (token) => {
  return jwt.verify(token, env.PASSWORD_RESET_TOKEN_SECRET);
};

export const findUserForAuth = async (email) => {
  return prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { profile: true }
  });
};

export const signupUser = async ({ name, email, password }) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'STUDENT',
      profile: {
        create: {}
      }
    },
    include: {
      profile: true
    }
  });

  return {
    user: sanitizeUser(user),
    token: createAccessToken(user)
  };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await findUserForAuth(normalizedEmail);

  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  if (user.status === 'SUSPENDED') {
    const err = new Error('This account has been suspended.');
    err.statusCode = 403;
    throw err;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  return {
    user: sanitizeUser(user),
    token: createAccessToken(user)
  };
};

export const loginAdminUser = async ({ email, password }) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await findUserForAuth(normalizedEmail);

  if (!user) {
    const err = new Error('Invalid admin credentials.');
    err.statusCode = 401;
    throw err;
  }

  if (user.role !== 'ADMIN') {
    const err = new Error('Only administrators can access this endpoint.');
    err.statusCode = 403;
    throw err;
  }

  if (user.status === 'SUSPENDED') {
    const err = new Error('This admin account has been suspended.');
    err.statusCode = 403;
    throw err;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const err = new Error('Invalid admin credentials.');
    err.statusCode = 401;
    throw err;
  }

  return {
    user: sanitizeUser(user),
    token: createAccessToken(user)
  };
};

export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true }
  });

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return sanitizeUser(user);
};

export const initiatePasswordReset = async (email) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await findUserForAuth(normalizedEmail);

  if (!user) {
    return {
      success: true,
      message: 'If an account exists for this email, a password reset instruction will be processed.'
    };
  }

  const resetToken = createPasswordResetToken(user);

  try {
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
    return {
      success: true,
      message: 'If an account exists for this email, a password reset instruction will be processed.'
    };
  } catch (error) {
    const err = new Error(error.message || 'Password reset email could not be sent.');
    err.statusCode = 500;
    throw err;
  }
};

export const resetPassword = async (token, password) => {
  let payload;

  try {
    payload = verifyPasswordResetToken(token);
  } catch (error) {
    const err = new Error('Invalid or expired password reset token.');
    err.statusCode = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub }
  });

  if (!user) {
    const err = new Error('User not found for this reset token.');
    err.statusCode = 404;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash
    }
  });

  return {
    success: true,
    message: 'Password reset successful.'
  };
};
