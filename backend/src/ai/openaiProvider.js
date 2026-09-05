/**
 * OpenAI-compatible chat completions provider.
 * Works with api.openai.com, Groq, and any compatible endpoint. The runtime
 * config (apiKey/model/baseUrl) is passed in by the facade, which resolves it
 * from admin-saved settings first and environment variables as a fallback.
 * API keys stay server-side — the frontend never sees them.
 */
const config = require('../config');

class ProviderError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
  }
}

async function chat({ messages, temperature = 0.4, maxTokens = 2200, json = false, ai }) {
  const { apiKey, model, baseUrl } = ai || config.ai;
  if (!apiKey) throw new ProviderError('AI API key is not set', 500);

  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (json) body.response_format = { type: 'json_object' };

  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new ProviderError(`Could not reach the AI service (${err.message})`);
  }

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message || '';
    } catch { /* ignore */ }
    if (res.status === 401 || res.status === 403) throw new ProviderError('AI API key was rejected', 502);
    if (res.status === 429) throw new ProviderError('AI provider rate limit reached, try again shortly', 502);
    throw new ProviderError(`AI provider error ${res.status}${detail ? `: ${String(detail).slice(0, 200)}` : ''}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new ProviderError('AI provider returned an empty response');
  }
  return content;
}

module.exports = { chat, ProviderError };
