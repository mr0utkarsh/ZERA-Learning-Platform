const { badRequest } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isValidEmail = (email) => typeof email === 'string' && EMAIL_RE.test(email.trim());

const isStrongPassword = (pw) =>
  typeof pw === 'string' && pw.length >= 8 && pw.length <= 128 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

const clampInt = (value, min, max, fallback) => {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

/** Extracts the first JSON object/array from potentially noisy AI output. */
const extractJson = (text) => {
  if (typeof text !== 'string') return null;
  const cleaned = text.trim();
  const candidates = [];
  const objStart = cleaned.indexOf('{');
  const arrStart = cleaned.indexOf('[');
  if (objStart >= 0) candidates.push(objStart);
  if (arrStart >= 0) candidates.push(arrStart);
  if (!candidates.length) return null;
  const start = Math.min(...candidates);
  const open = cleaned[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

const requireFields = (body, fields) => {
  const missing = fields.filter((f) => {
    const v = body?.[f];
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  });
  if (missing.length) throw badRequest(`Missing required fields: ${missing.join(', ')}`);
};

module.exports = { isValidEmail, isStrongPassword, clampInt, safeJsonParse, extractJson, requireFields };
