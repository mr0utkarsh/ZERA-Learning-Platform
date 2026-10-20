import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

/** Values that must never reach production, because they are public defaults. */
const INSECURE_DEFAULTS = new Set([
  'development-secret-change-me',
  'development-session-secret'
]);

const read = (key, fallback = '') => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
};

const readInt = (key, fallback) => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  NODE_ENV: read('NODE_ENV', 'development'),
  PORT: readInt('PORT', 5000),
  DATABASE_URL: read('DATABASE_URL'),
  DIRECT_URL: read('DIRECT_URL'),
  JWT_SECRET: read('JWT_SECRET', 'development-secret-change-me'),
  JWT_EXPIRES_IN: read('JWT_EXPIRES_IN', '7d'),
  CLIENT_URL: read('CLIENT_URL', 'http://localhost:3000'),
  ALLOWED_ORIGINS: read('ALLOWED_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  GEMINI_API_KEY: read('GEMINI_API_KEY'),
  GEMINI_MODEL: read('GEMINI_MODEL', 'gemini-2.0-flash'),
  GROQ_API_KEY: read('GROQ_API_KEY'),
  GROQ_MODEL: read('GROQ_MODEL', 'llama-3.3-70b-versatile'),
  OPENROUTER_API_KEY: read('OPENROUTER_API_KEY'),
  OPENROUTER_MODEL: read('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
  DEEPSEEK_API_KEY: read('DEEPSEEK_API_KEY'),
  DEEPSEEK_MODEL: read('DEEPSEEK_MODEL', 'deepseek-chat'),
  TOGETHER_API_KEY: read('TOGETHER_API_KEY'),
  TOGETHER_MODEL: read('TOGETHER_MODEL', 'meta-llama/Llama-3.3-70b-Instruct-Turbo'),
  HUGGINGFACE_API_KEY: read('HUGGINGFACE_API_KEY'),
  HUGGINGFACE_MODEL: read('HUGGINGFACE_MODEL', 'mistralai/Mistral-7B-Instruct-v0.3'),
  CLOUDFLARE_API_KEY: read('CLOUDFLARE_API_KEY'),
  CLOUDFLARE_MODEL: read('CLOUDFLARE_MODEL', '@cf/meta/llama-3.3-70b-instruct-fp8-fp8'),
  CLOUDFLARE_ACCOUNT_ID: read('CLOUDFLARE_ACCOUNT_ID'),
  MISTRAL_API_KEY: read('MISTRAL_API_KEY'),
  MISTRAL_MODEL: read('MISTRAL_MODEL', 'mistral-large-latest'),
  COHERE_API_KEY: read('COHERE_API_KEY'),
  COHERE_MODEL: read('COHERE_MODEL', 'command-r-plus'),
  NVIDIA_API_KEY: read('NVIDIA_API_KEY'),
  NVIDIA_MODEL: read('NVIDIA_MODEL', 'meta/llama-3.3-70b-instruct'),
  ELEVENLABS_API_KEY: read('ELEVENLABS_API_KEY'),
  AI_TIMEOUT_MS: readInt('AI_TIMEOUT_MS', 30_000),
  EMAIL_PROVIDER: read('EMAIL_PROVIDER').toLowerCase(),
  EMAIL_HOST: read('EMAIL_HOST'),
  EMAIL_PORT: readInt('EMAIL_PORT', 587),
  EMAIL_USER: read('EMAIL_USER'),
  EMAIL_PASS: read('EMAIL_PASS'),
  EMAIL_FROM: read('EMAIL_FROM', 'noreply@example.com'),
  // ── Search (Tavily) ──
  TAVILY_API_KEY: read('TAVILY_API_KEY'),
  // ── OCR (OCR.space) ──
  OCR_SPACE_API_KEY: read('OCR_SPACE_API_KEY'),
  // ── Supabase Storage (private buckets) ──
  SUPABASE_URL: read('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: read('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_SYLLABI_BUCKET: read('SUPABASE_SYLLABI_BUCKET', 'syllabi'),
  SUPABASE_HANDWRITING_BUCKET: read('SUPABASE_HANDWRITING_BUCKET', 'handwriting'),
  SIGNED_URL_EXPIRES_IN: readInt('SIGNED_URL_EXPIRES_IN', 900),
  // ── Brevo transactional email / SMS ──
  BREVO_API_KEY: read('BREVO_API_KEY'),
  BREVO_SMS_SENDER: read('BREVO_SMS_SENDER', 'ZERA'),
  BREVO_SMS_RECIPIENT: read('BREVO_SMS_RECIPIENT'),
  // ── OCR provider (legacy) ──
  OCR_PROVIDER: read('OCR_PROVIDER'),
  OCR_API_URL: read('OCR_API_URL'),
  OCR_API_KEY: read('OCR_API_KEY'),
  OCR_TIMEOUT_MS: readInt('OCR_TIMEOUT_MS', 30_000),
  SESSION_SECRET: read('SESSION_SECRET', 'development-session-secret'),
  PASSWORD_RESET_TOKEN_SECRET: read(
    'PASSWORD_RESET_TOKEN_SECRET',
    read('JWT_SECRET', 'development-secret-change-me')
  ),
  PASSWORD_RESET_TOKEN_EXPIRES_IN: read('PASSWORD_RESET_TOKEN_EXPIRES_IN', '1h'),
  MAX_UPLOAD_BYTES: readInt('MAX_UPLOAD_BYTES', 10 * 1024 * 1024),
  SEED_ADMIN_EMAIL: read('SEED_ADMIN_EMAIL'),
  SEED_ADMIN_PASSWORD: read('SEED_ADMIN_PASSWORD'),
  SEED_ADMIN_NAME: read('SEED_ADMIN_NAME')
};

export const isProd = isProduction;

/**
 * Origins permitted to call the API. In production this must be an explicit
 * allow-list: there is no wildcard, no `null` origin, and no implicit localhost.
 */
export const allowedOrigins = () => {
  if (env.ALLOWED_ORIGINS.length > 0) return env.ALLOWED_ORIGINS;
  if (isProduction) return [];
  return [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];
};

export const validateEnv = () => {
  const problems = [];

  if (!env.DATABASE_URL) problems.push('DATABASE_URL is not set');
  if (!env.JWT_SECRET) problems.push('JWT_SECRET is not set');
  if (!env.SESSION_SECRET) problems.push('SESSION_SECRET is not set');
  if (!env.PASSWORD_RESET_TOKEN_SECRET) problems.push('PASSWORD_RESET_TOKEN_SECRET is not set');

  if (isProduction) {
    if (INSECURE_DEFAULTS.has(env.JWT_SECRET)) {
      problems.push('JWT_SECRET is still the public development default');
    }
    if (INSECURE_DEFAULTS.has(env.SESSION_SECRET)) {
      problems.push('SESSION_SECRET is still the public development default');
    }
    if (INSECURE_DEFAULTS.has(env.PASSWORD_RESET_TOKEN_SECRET)) {
      problems.push('PASSWORD_RESET_TOKEN_SECRET is still the public development default');
    }
    if (env.ALLOWED_ORIGINS.length === 0) {
      problems.push('ALLOWED_ORIGINS must list the frontend origins allowed in production');
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${problems.join('\n  - ')}`);
  }
};

/** @deprecated use validateEnv */
export const ensureRequiredEnv = validateEnv;
