const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 5000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',

  jwtSecret: process.env.JWT_SECRET || 'zera-insecure-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: int(process.env.SMTP_PORT, 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'ZERA <no-reply@zera.local>',
  },
  devShowOtp: String(process.env.DEV_SHOW_OTP).toLowerCase() === 'true',

  ai: {
    provider: (process.env.AI_PROVIDER || 'none').toLowerCase(),
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    maxInputChars: int(process.env.AI_MAX_INPUT_CHARS, 8000),
  },

  maxUploadMb: int(process.env.MAX_UPLOAD_MB, 5),
  uploadsDir: path.join(__dirname, '..', '..', 'uploads'),

  otp: {
    ttlMinutes: 8,
    maxAttempts: 5,
    resendCooldownSec: 45,
  },

  isProduction() {
    return this.env === 'production';
  },
  emailConfigured() {
    return Boolean(this.smtp.host && this.smtp.user);
  },
};

if (config.isProduction() && config.jwtSecret.includes('change')) {
  throw new Error('JWT_SECRET must be set to a strong secret in production');
}

module.exports = config;
