<<<<<<< HEAD
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { emailService } from './emailService.js';

// ─── Sanitization ─────────────────────────────────────────────────────────────
export const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

// ─── JWT helpers ──────────────────────────────────────────────────────────────
// `ver` carries the user's tokenVersion so a password change or reset can
// invalidate every previously issued token.
export const createAccessToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, ver: user.tokenVersion ?? 0 },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

// Reset tokens carry a unique `jti` so each issued token can be burned after a
// single use. A JWT is otherwise replayable until it expires.
export const createPasswordResetToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, purpose: 'password_reset', jti: crypto.randomUUID() },
    env.PASSWORD_RESET_TOKEN_SECRET,
    { expiresIn: env.PASSWORD_RESET_TOKEN_EXPIRES_IN }
  );
};

export const verifyPasswordResetToken = (token) => {
  const payload = jwt.verify(token, env.PASSWORD_RESET_TOKEN_SECRET);
  if (payload.purpose !== 'password_reset') {
    const err = new Error('Invalid or expired password reset token.');
    err.statusCode = 401;
    throw err;
  }
  return payload;
};

/** Bumps tokenVersion, which invalidates all outstanding access tokens. */
export const invalidateUserTokens = (userId) =>
  prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } }
  });

// ─── User lookup ──────────────────────────────────────────────────────────────
export const findUserForAuth = async (email) => {
  return prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { profile: true }
  });
};

// ─── Signup ───────────────────────────────────────────────────────────────────
export const signupUser = async ({ name, email, password }) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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
      profile: { create: {} }
    },
    include: { profile: true }
  });

  return { user: sanitizeUser(user), token: createAccessToken(user) };
};

// ─── Student login ────────────────────────────────────────────────────────────
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

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return { user: sanitizeUser(user), token: createAccessToken(user) };
};

// ─── Admin login ──────────────────────────────────────────────────────────────
export const loginAdminUser = async ({ email, password }) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await findUserForAuth(normalizedEmail);

  if (!user) {
    const err = new Error('Invalid admin credentials.');
    err.statusCode = 401;
    throw err;
  }

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
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

  return { user: sanitizeUser(user), token: createAccessToken(user) };
};

// ─── Get current user ─────────────────────────────────────────────────────────
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

// ─── JWT-based password reset (email link) ────────────────────────────────────
export const initiatePasswordReset = async (email) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await findUserForAuth(normalizedEmail);

  // Always return the same response to prevent user enumeration
  const successResponse = {
    message: 'If an account exists for this email, a password reset instruction will be processed.'
  };

  if (!user) return successResponse;

  const resetToken = createPasswordResetToken(user);

  try {
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
  } catch (error) {
    const err = new Error(error.message || 'Password reset email could not be sent.');
    err.statusCode = 500;
    throw err;
  }

  return successResponse;
};

export const resetPassword = async (token, password) => {
  let payload;
  try {
    payload = verifyPasswordResetToken(token);
  } catch {
    const err = new Error('Invalid or expired password reset token.');
    err.statusCode = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    const err = new Error('User not found for this reset token.');
    err.statusCode = 404;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Recording the jti and rotating the password must be atomic: a concurrent
  // replay of the same token then loses the insert on the primary key.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.usedResetToken.create({
        data: {
          jti: payload.jti,
          userId: user.id,
          expiresAt: new Date((payload.exp ?? Math.floor(Date.now() / 1000)) * 1000)
        }
      });
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, tokenVersion: { increment: 1 } }
      });
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      const err = new Error('This password reset link has already been used.');
      err.statusCode = 401;
      throw err;
    }
    throw error;
  }

  return { message: 'Password reset successful.' };
};

// ─── OTP-based password reset ────────────────────────────────────────────────
const OTP_EXPIRES_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

export const initiateOtpReset = async (email) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  // Always respond the same way to prevent user enumeration
  const successResponse = {
    message: 'If an account exists for this email, a 6-digit OTP has been sent.'
  };

  const user = await findUserForAuth(normalizedEmail);
  if (!user) return successResponse;

  // Remove any existing OTP records for this email
  await prisma.passwordResetOtp.deleteMany({ where: { email: normalizedEmail } });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

  await prisma.passwordResetOtp.create({
    data: { email: normalizedEmail, otpHash, expiresAt }
  });

  try {
    await emailService.sendOtpEmail(user.email, user.name, otp);
  } catch (error) {
    const err = new Error(error.message || 'OTP email could not be sent.');
    err.statusCode = 500;
    throw err;
  }

  return successResponse;
};

export const verifyOtpAndResetPassword = async (email, otp, newPassword) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const record = await prisma.passwordResetOtp.findFirst({
    where: { email: normalizedEmail },
    orderBy: { createdAt: 'desc' }
  });

  if (!record) {
    const err = new Error('No OTP request found. Please request a new OTP.');
    err.statusCode = 400;
    throw err;
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.passwordResetOtp.delete({ where: { id: record.id } });
    const err = new Error('Too many incorrect attempts. Please request a new OTP.');
    err.statusCode = 429;
    throw err;
  }

  if (new Date() > record.expiresAt) {
    await prisma.passwordResetOtp.delete({ where: { id: record.id } });
    const err = new Error('OTP has expired. Please request a new OTP.');
    err.statusCode = 400;
    throw err;
  }

  const isValid = await bcrypt.compare(String(otp), record.otpHash);

  if (!isValid) {
    await prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } }
    });
    const remaining = OTP_MAX_ATTEMPTS - record.attempts - 1;
    const err = new Error(`Invalid OTP. ${remaining} attempt(s) remaining.`);
    err.statusCode = 400;
    throw err;
  }

  // OTP is valid – update password and clean up
  const user = await findUserForAuth(normalizedEmail);
  if (!user) {
    const err = new Error('Account not found.');
    err.statusCode = 404;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  // tokenVersion is bumped so any session signed in with the old password stops
  // working, and the OTP record is consumed so it cannot be replayed.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, tokenVersion: { increment: 1 } }
    }),
    prisma.passwordResetOtp.delete({ where: { id: record.id } })
  ]);

  return { message: 'Password reset successfully.' };
};
=======
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { emailService, sendOtpEmail } from './emailService.js';

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

export const requestPasswordOtp = async (email) => {
  const user = await findUserForAuth(email);
  if (!user) return { success: true, message: 'If an account exists, a verification code will be sent.' };
  const latest = await prisma.otpChallenge.findFirst({ where: { userId: user.id, purpose: 'PASSWORD_RESET' }, orderBy: { createdAt: 'desc' } });
  if (latest && Date.now() - latest.lastSentAt.getTime() < 60_000) { const error = new Error('Please wait before requesting another code.'); error.statusCode = 429; throw error; }
  const otp = String(crypto.randomInt(100000, 1000000));
  const challenge = await prisma.otpChallenge.create({ data: { userId: user.id, purpose: 'PASSWORD_RESET', codeHash: await bcrypt.hash(otp, 12), expiresAt: new Date(Date.now() + 10 * 60_000) } });
  try { await sendOtpEmail(user.email, user.name, otp); } catch (error) { await prisma.otpChallenge.delete({ where: { id: challenge.id } }); throw error; }
  return { success: true, message: 'If an account exists, a verification code will be sent.' };
};

export const verifyPasswordOtp = async (email, otp) => {
  const user = await findUserForAuth(email);
  if (!user) { const error = new Error('Invalid verification code.'); error.statusCode = 401; throw error; }
  const challenge = await prisma.otpChallenge.findFirst({ where: { userId: user.id, purpose: 'PASSWORD_RESET', verifiedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!challenge || challenge.expiresAt < new Date()) { const error = new Error('The verification code is invalid or expired.'); error.statusCode = 401; throw error; }
  if (challenge.attempts >= 5) { const error = new Error('Too many invalid code attempts. Request a new code.'); error.statusCode = 429; throw error; }
  const valid = await bcrypt.compare(String(otp), challenge.codeHash);
  if (!valid) { await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } }); const error = new Error('The verification code is invalid.'); error.statusCode = 401; throw error; }
  await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { verifiedAt: new Date() } });
  return { success: true, resetToken: createPasswordResetToken(user) };
};
>>>>>>> 4804780593c11e68ae22b39c559dc624c40d29a7
