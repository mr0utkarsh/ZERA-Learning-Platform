import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER || '').toLowerCase(),
  EMAIL_HOST: process.env.EMAIL_HOST || '',
  EMAIL_PORT: Number(process.env.EMAIL_PORT || 587),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@example.com',
  EMAIL_SECURE: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true',
  PASSWORD_RESET_URL: process.env.PASSWORD_RESET_URL || '',
  SESSION_SECRET: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-session-secret'),
  PASSWORD_RESET_TOKEN_SECRET: process.env.PASSWORD_RESET_TOKEN_SECRET || process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-secret-change-me'),
  PASSWORD_RESET_TOKEN_EXPIRES_IN: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '1h',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
  OAUTH_CALLBACK_BASE: process.env.OAUTH_CALLBACK_BASE || process.env.CLIENT_URL || 'http://localhost:8000',
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:8000'
};

export const ensureRequiredEnv = () => {
  const missing = [];

  if (!env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!env.PASSWORD_RESET_TOKEN_SECRET) missing.push('PASSWORD_RESET_TOKEN_SECRET');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
