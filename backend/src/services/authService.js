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

export const signOAuthState = (payload) => {
  return jwt.sign(
    { ...payload, purpose: 'oauth_state' },
    env.JWT_SECRET,
    { expiresIn: '10m' }
  );
};

export const verifyOAuthState = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
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

export const createVerificationToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      purpose: 'email_verification'
    },
    env.PASSWORD_RESET_TOKEN_SECRET,
    { expiresIn: env.PASSWORD_RESET_TOKEN_EXPIRES_IN }
  );
};

export const verifyVerificationToken = (token) => {
  return jwt.verify(token, env.PASSWORD_RESET_TOKEN_SECRET);
};

export const findUserForAuth = async (email) => {
  return prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { profile: true }
  });
};

export const findUserByProvider = async (provider, providerId) => {
  const where = provider === 'google' ? { googleId: providerId } : { githubId: providerId };
  return prisma.user.findUnique({
    where,
    include: { profile: true }
  });
};

export const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { profile: true }
  });
};

export const signupUser = async ({ name, email, password, provider, providerId, emailVerified }) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  let passwordHash = null;
  if (password) {
    passwordHash = await bcrypt.hash(password, 12);
  }

  const data = {
    name,
    email: normalizedEmail,
    role: 'STUDENT',
    emailVerified: Boolean(emailVerified),
    profile: { create: {} }
  };

  if (provider === 'google') {
    data.googleId = providerId;
  } else if (provider === 'github') {
    data.githubId = providerId;
  }

  if (passwordHash) {
    data.passwordHash = passwordHash;
  }

  const user = await prisma.user.create({
    data,
    include: { profile: true }
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

  if (!user.passwordHash) {
    const err = new Error('This account does not have a password set. Use the connected provider to sign in.');
    err.statusCode = 401;
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

  if (!user.passwordHash) {
    const err = new Error('This account does not have a password set.');
    err.statusCode = 401;
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
    const existingByEmail = await findUserByEmail(normalizedEmail);
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

export const initiatePasswordReset = async (email) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      success: true,
      message: 'If an account exists for this email, a password reset instruction will be processed.'
    };
  }

  if (user.status === 'SUSPENDED') {
    return {
      success: true,
      message: 'If an account exists for this email, a password reset instruction will be processed.'
    };
  }

  const resetToken = createPasswordResetToken(user);
  const expiresAt = new Date(Date.now() + parseMs(env.PASSWORD_RESET_TOKEN_EXPIRES_IN));

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt
    }
  });

  try {
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
  } catch (error) {
    console.error('Password reset email could not be sent:', error.message);
  }

  return {
    success: true,
    message: 'If an account exists for this email, a password reset instruction will be processed.'
  };
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

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      token,
      userId: payload.sub,
      usedAt: null,
      expiresAt: { gt: new Date() }
    }
  });

  if (!record) {
    const err = new Error('Invalid, expired, or already used password reset token.');
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

  if (user.status === 'SUSPENDED') {
    const err = new Error('This account has been suspended.');
    err.statusCode = 403;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    })
  ]);

  return {
    success: true,
    message: 'Password reset successful.'
  };
};

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

  await prisma.verificationToken.deleteMany({ where: { userId } });

  const verificationToken = createVerificationToken(user);
  const expiresAt = new Date(Date.now() + parseMs(env.PASSWORD_RESET_TOKEN_EXPIRES_IN));

  await prisma.verificationToken.create({
    data: { userId, token: verificationToken, expiresAt }
  });

  try {
    await emailService.sendVerificationEmail(user.email, user.name, verificationToken);
  } catch (error) {
    await prisma.verificationToken.deleteMany({ where: { token: verificationToken } });
    const err = new Error(error.message || 'Verification email could not be sent.');
    err.statusCode = 500;
    throw err;
  }

  return { success: true, message: 'Verification email sent.' };
};

export const verifyEmail = async (token) => {
  let payload;

  try {
    payload = verifyVerificationToken(token);
  } catch (error) {
    const err = new Error('Invalid or expired verification token.');
    err.statusCode = 401;
    throw err;
  }

  const record = await prisma.verificationToken.findFirst({
    where: {
      token,
      userId: payload.sub,
      usedAt: null,
      expiresAt: { gt: new Date() }
    }
  });

  if (!record) {
    const err = new Error('Invalid, expired, or already used verification token.');
    err.statusCode = 401;
    throw err;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: payload.sub },
      data: { emailVerified: true }
    }),
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    })
  ]);

  return { success: true, message: 'Email verified successfully.' };
};

function parseMs(value) {
  const match = String(value || '1h').match(/^(\d+)(m|h|d)$/);
  if (!match) return 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return amount * (multipliers[unit] || 60 * 60 * 1000);
}

function buildState({ provider, nonce }) {
  return signOAuthState({ provider, nonce });
}

export const googleAuthorize = () => {
  if (!env.GOOGLE_CLIENT_ID) {
    const err = new Error('Google OAuth is not configured on the server.');
    err.statusCode = 503;
    throw err;
  }

  const nonce = crypto.randomUUID();
  const state = buildState({ provider: 'google', nonce });
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

  return { authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, state };
};

export const googleCallback = async ({ code, state }) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    const err = new Error('Google OAuth is not configured on the server.');
    err.statusCode = 503;
    throw err;
  }

  let payload;
  try {
    payload = verifyOAuthState(state);
  } catch (error) {
    const err = new Error('Invalid or expired OAuth state.');
    err.statusCode = 401;
    throw err;
  }

  if (payload.provider !== 'google') {
    const err = new Error('OAuth state provider mismatch.');
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
  const result = await findOrCreateOAuthUser({
    provider: 'google',
    providerId: String(userinfo.id),
    email,
    name: userinfo.name || email,
    emailVerified
  });

  return { user: result.user, token: createAccessToken(result.user), isNew: result.isNew };
};

export const githubAuthorize = () => {
  if (!env.GITHUB_CLIENT_ID) {
    const err = new Error('GitHub OAuth is not configured on the server.');
    err.statusCode = 503;
    throw err;
  }

  const nonce = crypto.randomUUID();
  const state = buildState({ provider: 'github', nonce });
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.OAUTH_CALLBACK_BASE.replace(/\/$/, '')}/api/auth/oauth/github/callback`,
    scope: 'read:user user:email',
    state
  });

  return { authorizationUrl: `https://github.com/login/oauth/authorize?${params.toString()}`, state };
};

export const githubCallback = async ({ code, state }) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    const err = new Error('GitHub OAuth is not configured on the server.');
    err.statusCode = 503;
    throw err;
  }

  let payload;
  try {
    payload = verifyOAuthState(state);
  } catch (error) {
    const err = new Error('Invalid or expired OAuth state.');
    err.statusCode = 401;
    throw err;
  }

  if (payload.provider !== 'github') {
    const err = new Error('OAuth state provider mismatch.');
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

  const result = await findOrCreateOAuthUser({
    provider: 'github',
    providerId: String(profile.id),
    email,
    name: profile.name || profile.login || email,
    emailVerified
  });

  return { user: result.user, token: createAccessToken(result.user), isNew: result.isNew };
};
