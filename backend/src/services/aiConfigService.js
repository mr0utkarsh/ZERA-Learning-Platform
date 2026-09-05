/**
 * Runtime AI configuration set by admins (Admin Panel → Settings → API
 * Configuration), stored encrypted in the AdminSetting table.
 *
 * Precedence:
 *   1. Admin-saved settings (DB) — take over completely once present.
 *   2. Environment variables (AI_PROVIDER / AI_API_KEY / ...) — the original
 *      architecture, unchanged.
 *   3. Neither → provider "none": AI features return an honest 503.
 *
 * Security: API keys are AES-256-GCM encrypted at rest, never returned in
 * full by any endpoint, never logged, and only ever used for the configured
 * provider's own endpoint.
 */
const prisma = require('../config/prisma');
const config = require('../config');
const { encryptSecret, decryptSecret, isEncryptedToken } = require('../utils/crypto');
const { badRequest } = require('../utils/errors');

const PROVIDERS = ['none', 'openai', 'gemini', 'groq'];

const PROVIDER_DEFAULTS = {
  openai: { model: 'gpt-4o-mini', kind: 'openai-compat', baseUrl: () => config.ai.baseUrl },
  groq: { model: 'openai/gpt-oss-120b', kind: 'openai-compat', baseUrl: () => 'https://api.groq.com/openai/v1' },
  // Alias maintained by Google to always point at the current stable Flash
  // model (individual model ids get deprecated for new API keys over time).
  gemini: { model: 'gemini-flash-latest', kind: 'gemini', baseUrl: () => 'https://generativelanguage.googleapis.com/v1beta' },
};

const KEYS_ROW = 'ai.keys'; // single encrypted JSON blob: { openai?, gemini?, groq? }
const PROVIDER_ROW = 'ai.provider';
const MODEL_ROW = 'ai.model';

const CACHE_TTL_MS = 30_000;
let cache = null; // { at, settings }

function invalidateCache() {
  cache = null;
}

/** Load + decrypt admin settings. Missing/corrupt values degrade to "unset". */
async function loadAdminSettings() {
  const rows = await prisma.adminSetting.findMany({
    where: { key: { in: [PROVIDER_ROW, MODEL_ROW, KEYS_ROW] } },
  });
  if (!rows.length) return null; // admin never configured -> env fallback

  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const provider = PROVIDERS.includes(byKey[PROVIDER_ROW]) ? byKey[PROVIDER_ROW] : 'none';
  const model = typeof byKey[MODEL_ROW] === 'string' ? byKey[MODEL_ROW].slice(0, 120) : '';

  let keys = { openai: '', gemini: '', groq: '' };
  if (byKey[KEYS_ROW]) {
    const plain = isEncryptedToken(byKey[KEYS_ROW]) ? decryptSecret(byKey[KEYS_ROW]) : null;
    if (plain) {
      try {
        const parsed = JSON.parse(plain) || {};
        for (const p of ['openai', 'gemini', 'groq']) {
          if (typeof parsed[p] === 'string' && parsed[p].trim()) keys[p] = parsed[p].trim();
        }
      } catch {
        console.warn('[ai-config] stored key blob could not be parsed; treating keys as unset');
      }
    } else {
      console.warn('[ai-config] stored key blob failed to decrypt; treating keys as unset');
    }
  }
  return { provider, model, keys, configuredByAdmin: true };
}

/**
 * Effective AI config for the facade. Shape matches config.ai so providers
 * can consume it unchanged: { provider, apiKey, model, baseUrl }.
 */
async function getEffectiveAiConfig() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  let value;
  const admin = await loadAdminSettings().catch(() => null);
  if (admin) {
    const defaults = PROVIDER_DEFAULTS[admin.provider];
    value = {
      provider: admin.provider,
      apiKey: defaults ? admin.keys[admin.provider] || '' : '',
      model: admin.model || (defaults ? defaults.model : ''),
      baseUrl: defaults ? defaults.baseUrl() : '',
      kind: defaults ? defaults.kind : 'none',
      source: 'admin',
    };
  } else {
    value = {
      provider: config.ai.provider,
      apiKey: config.ai.apiKey,
      model: config.ai.model,
      baseUrl: config.ai.baseUrl,
      kind: config.ai.provider === 'openai' ? 'openai-compat' : 'none',
      source: 'env',
    };
  }
  cache = { at: Date.now(), value };
  return value;
}

function maskKey(key) {
  const k = String(key || '');
  if (k.length <= 8) return '••••';
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

/** Sanitized view for GET /api/admin/settings — never contains full keys. */
async function getSettingsView() {
  const admin = await loadAdminSettings().catch(() => null);
  const effective = await getEffectiveAiConfig();
  const keys = { openai: '', gemini: '', groq: '' };
  if (admin) Object.assign(keys, admin.keys);
  return {
    source: admin ? 'admin' : 'env',
    provider: effective.provider,
    model: admin ? admin.model : '',
    configured: effective.provider !== 'none' && Boolean(effective.apiKey),
    keys: {
      openai: { set: Boolean(keys.openai), masked: keys.openai ? maskKey(keys.openai) : null },
      gemini: { set: Boolean(keys.gemini), masked: keys.gemini ? maskKey(keys.gemini) : null },
      groq: { set: Boolean(keys.groq), masked: keys.groq ? maskKey(keys.groq) : null },
    },
    defaults: {
      openai: { model: PROVIDER_DEFAULTS.openai.model },
      gemini: { model: PROVIDER_DEFAULTS.gemini.model },
      groq: { model: PROVIDER_DEFAULTS.groq.model },
    },
  };
}

/**
 * Save admin settings. `keys` only needs to contain values the admin entered
 * (unchanged providers are omitted); `removeKeys` explicitly clears stored keys.
 */
async function saveSettings({ provider, model, keys, removeKeys }, actor) {
  const prov = String(provider ?? '').trim().toLowerCase();
  if (!PROVIDERS.includes(prov)) {
    throw badRequest(`Provider must be one of: ${PROVIDERS.join(', ')}`);
  }
  if (model !== undefined && model !== null && String(model).length > 120) {
    throw badRequest('Model name is too long (max 120 characters)');
  }

  const current = (await loadAdminSettings().catch(() => null)) || {
    provider: 'none', model: '', keys: { openai: '', gemini: '', groq: '' },
  };
  const nextKeys = { ...current.keys };
  const changes = [];

  for (const p of ['openai', 'gemini', 'groq']) {
    const incoming = keys?.[p];
    if (incoming !== undefined && incoming !== null && String(incoming).trim() !== '') {
      const clean = String(incoming).trim();
      if (clean.length < 8 || clean.length > 300 || /[\x00-\x1f]/.test(clean)) {
        throw badRequest(`The ${p} API key doesn't look valid`);
      }
      nextKeys[p] = clean;
      changes.push(`${p} key set`);
    }
  }
  for (const p of removeKeys || []) {
    if (['openai', 'gemini', 'groq'].includes(p) && nextKeys[p]) {
      nextKeys[p] = '';
      changes.push(`${p} key removed`);
    }
  }

  if (prov !== 'none' && !nextKeys[prov]) {
    throw badRequest(`Add an API key for "${prov}" before making it the active provider`);
  }

  const blob = encryptSecret(JSON.stringify(nextKeys));
  await prisma.$transaction([
    prisma.adminSetting.upsert({ where: { key: PROVIDER_ROW }, update: { value: prov }, create: { key: PROVIDER_ROW, value: prov } }),
    prisma.adminSetting.upsert({
      where: { key: MODEL_ROW },
      update: { value: String(model ?? '').trim() },
      create: { key: MODEL_ROW, value: String(model ?? '').trim() },
    }),
    prisma.adminSetting.upsert({ where: { key: KEYS_ROW }, update: { value: blob }, create: { key: KEYS_ROW, value: blob } }),
  ]);

  if (actor) {
    await prisma.activityLog.create({
      data: {
        userId: actor.id,
        type: 'ADMIN_AI_SETTINGS',
        message: `AI configuration updated (provider: ${prov}${changes.length ? `; ${changes.join(', ')}` : ''})`,
        meta: JSON.stringify({ provider: prov, changes }), // changes describe *which* keys, never values
      },
    }).catch(() => {});
  }

  invalidateCache();
  return getSettingsView();
}

/** Test helper — wipe all admin AI settings. */
async function clearAllSettings() {
  await prisma.adminSetting.deleteMany({ where: { key: { in: [PROVIDER_ROW, MODEL_ROW, KEYS_ROW] } } });
  invalidateCache();
}

module.exports = {
  PROVIDERS,
  PROVIDER_DEFAULTS,
  getEffectiveAiConfig,
  getSettingsView,
  saveSettings,
  clearAllSettings,
  invalidateCache,
  maskKey,
};
