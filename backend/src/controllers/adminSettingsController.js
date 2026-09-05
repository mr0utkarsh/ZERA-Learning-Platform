/**
 * Admin Panel → Settings.
 * Currently: API Configuration (AI provider + keys). All responses are
 * sanitized — stored API keys are only ever represented as masked values.
 */
const aiConfigService = require('../services/aiConfigService');
const { ok } = require('../utils/response');

/** GET /api/admin/settings — sanitized view (masked keys only). */
async function getSettings(req, res, next) {
  try {
    const view = await aiConfigService.getSettingsView();
    return ok(res, { settings: view });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/settings
 * Body: { provider, model?, keys?: { openai?, gemini?, groq? }, removeKeys?: string[] }
 * Only keys the admin actually typed need to be included.
 */
async function updateSettings(req, res, next) {
  try {
    const { provider, model, keys, removeKeys } = req.body || {};
    const view = await aiConfigService.saveSettings({ provider, model, keys, removeKeys }, req.user);
    return ok(res, { settings: view }, 'API configuration saved');
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings };
