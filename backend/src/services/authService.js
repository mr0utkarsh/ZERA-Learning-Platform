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

// ─── OAuth (Google / GitHub) ────────────────────────────────────────────────

function buildOAuthState({ provider, nonce }) {
  return jwt.sign(
    { provider, nonce, purpose: 'oauth_state' },
    env.JWT_SECRET,
    { expiresIn: '10m' }
  );
}

export const googleAuthorize = () => {
  if (!env.GOOGLE_CLIENT_ID) {
    const err = new Error('Google OAuth is not configured on the server.');
    err.statusCode = 503;
    throw err;
  }

  const nonce = crypto.randomUUID();
  const state = buildOAuthState({ provider: 'google', nonce });
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.OAUTH_CALLBACK_BASE.replace(/\/$/, '')}/api/auth/oauth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    access_type: 'offline',
    prompt: 'consent'
  });

  return {
    authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    state
  };
};

export const googleCallback = async ({ code, state }) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    const err = new Error('Google OAuth is not configured on the server.');
    err.statusCode = 503;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(state, env.JWT_SECRET);
    if (payload.purpose !== 'oauth_state' || payload.provider !== 'google') {
      throw new Error('state mismatch');
    }
  } catch {
    const err = new Error('Invalid or expired OAuth state.');
    err.statusCode = 401;
    throw err;
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${env.OAUTH_CALLBACK_BASE.replace(/\/$/, '')}/api/auth/oauth/google/callback`
    }).toString()
  });

  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.id_token || !tokenData.access_token) {
    const err = new Error(tokenData.error_description || 'Failed to exchange Google authorization code.');
    err.statusCode = 401;
    throw err;
  }

  const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const userinfo = await userinfoResponse.json().catch(() => ({}));
  if (!userinfoResponse.ok || !userinfo.id) {
    const err = new Error('Failed to retrieve Google account profile.');
    err.statusCode = 401;
    throw err;
  }

  const email = String(userinfo.email || '').trim().toLowerCase();
  const emailVerified = Boolean(userinfo.verified_email);
  return findOrCreateOAuthUser({
    provider: 'google',
    providerId: String(userinfo.id),
    email,
    name: userinfo.name || email,
    emailVerified
  });
};

export const githubAuthorize = () => {
  if (!env.GITHUB_CLIENT_ID) {
    const err = new Error('GitHub OAuth is not configured on the server.');
    err.statusCode = 503;
    throw err;
  }

  const nonce = crypto.randomUUID();
  const state = buildOAuthState({ provider: 'github', nonce });
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.OAUTH_CALLBACK_BASE.replace(/\/$/, '')}/api/auth/oauth/github/callback`,
    scope: 'read:user user:email',
    state
  });

  return {
    authorizationUrl: `https://github.com/login/oauth/authorize?${params.toString()}`,
    state
  };
};

export const githubCallback = async ({ code, state }) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    const err = new Error('GitHub OAuth is not configured on the server.');
    err.statusCode = 503;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(state, env.JWT_SECRET);
    if (payload.purpose !== 'oauth_state' || payload.provider !== 'github') {
      throw new Error('state mismatch');
    }
  } catch {
    const err = new Error('Invalid or expired OAuth state.');
    err.statusCode = 401;
    throw err;
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code
    })
  });

  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token || tokenData.error) {
    const err = new Error(tokenData.error_description || 'Failed to exchange GitHub authorization code.');
    err.statusCode = 401;
    throw err;
  }

  const profileResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'ZERA-Learning-Platform'
    }
  });
  const profile = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok || !profile.id) {
    const err = new Error('Failed to retrieve GitHub account profile.');
    err.statusCode = 401;
    throw err;
  }

  let email = '';
  let emailVerified = false;
  try {
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'ZERA-Learning-Platform'
      }
    });
    const emails = await emailsResponse.json().catch(() => []);
    if (Array.isArray(emails)) {
      const primary = emails.find((e) => e.primary && e.verified);
      if (primary) {
        email = String(primary.email).trim().toLowerCase();
        emailVerified = true;
      } else {
        const first = emails[0];
        if (first) {
          email = String(first.email).trim().toLowerCase();
          emailVerified = Boolean(first.verified);
        }
      }
    }
  } catch {
    email = '';
    emailVerified = false;
  }

  if (!email) {
    const err = new Error('GitHub account has no usable email address. Add a verified primary email to your GitHub account.');
    err.statusCode = 400;
    throw err;
  }

  return findOrCreateOAuthUser({
    provider: 'github',
    providerId: String(profile.id),
    email,
    name: profile.name || profile.login || email,
    emailVerified
  });
};

export const findUserByProvider = async (provider, providerId) => {
  const where = provider === 'google' ? { googleId: providerId } : { githubId: providerId };
  return prisma.user.findUnique({ where, include: { profile: true } });
};

export const findOrCreateOAuthUser = async ({ provider, providerId, email, name, emailVerified }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const linkedUser = await findUserByProvider(provider, providerId);
  if (linkedUser) {
    if (linkedUser.status === 'SUSPENDED') {
      const err = new Error('This account has been suspended.');
      err.statusCode = 403;
      throw err;
    }
    return { user: linkedUser, isNew: false };
  }

  if (normalizedEmail) {
    const existingByEmail = await findUserForAuth(normalizedEmail);
    if (existingByEmail) {
      const err = new Error('account_exists');
      err.statusCode = 409;
      err.message = 'An account with this email already exists. Please sign in with your password to link your account.';
      throw err;
    }
  }

  const user = await prisma.user.create({
    data: {
      name: name || normalizedEmail || 'User',
      email: normalizedEmail || `${providerId}@${provider}.oauth.invalid`,
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerified: Boolean(emailVerified),
      [provider === 'google' ? 'googleId' : 'githubId']: providerId,
      profile: { create: {} }
    },
    include: { profile: true }
  });

  return { user, isNew: true };
};

// ─── Email verification ─────────────────────────────────────────────────────

export const initiateEmailVerification = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  if (user.emailVerified) {
    return { success: true, message: 'Email is already verified.' };
  }

  await prisma.verificationOtp.deleteMany({ where: { email: user.email, purpose: 'EMAIL_VERIFY' } });

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.verificationOtp.create({
    data: {
      email: user.email,
      channel: 'EMAIL',
      purpose: 'EMAIL_VERIFY',
      codeHash: otpHash,
      expiresAt
    }
  });

  try {
    await emailService.sendOtpEmail(user.email, user.name, otp);
  } catch (error) {
    await prisma.verificationOtp.deleteMany({ where: { email: user.email, purpose: 'EMAIL_VERIFY' } });
    const err = new Error(error.message || 'Verification email could not be sent.');
    err.statusCode = 500;
    throw err;
  }

  return { success: true, message: 'Verification code sent.' };
};

export const verifyEmail = async (email, otp) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const record = await prisma.verificationOtp.findFirst({
    where: { email: normalizedEmail, purpose: 'EMAIL_VERIFY' },
    orderBy: { createdAt: 'desc' }
  });

  if (!record) {
    const err = new Error('No verification request found. Please request a new code.');
    err.statusCode = 400;
    throw err;
  }

  if (record.consumedAt) {
    const err = new Error('This verification code has already been used.');
    err.statusCode = 401;
    throw err;
  }

  if (new Date() > record.expiresAt) {
    await prisma.verificationOtp.delete({ where: { id: record.id } });
    const err = new Error('Verification code has expired. Please request a new code.');
    err.statusCode = 400;
    throw err;
  }

  const isValid = await bcrypt.compare(String(otp), record.codeHash);
  if (!isValid) {
    await prisma.verificationOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } }
    });
    const err = new Error('Invalid verification code.');
    err.statusCode = 400;
    throw err;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email: normalizedEmail },
      data: { emailVerified: true }
    }),
    prisma.verificationOtp.update({
      where: { id: record.id },
      data: { consumedAt: new Date() }
    })
  ]);

  return { success: true, message: 'Email verified successfully.' };
};
