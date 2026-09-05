/**
 * Google Gemini provider (Generative Language API).
 * Accepts the same OpenAI-style message array as the OpenAI-compatible
 * provider and translates it to the Gemini wire format. API keys stay
 * server-side and are never echoed in errors or logs.
 */

class ProviderError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
  }
}

function splitMessages(messages) {
  const system = [];
  const contents = [];
  for (const m of messages || []) {
    if (m.role === 'system') system.push(String(m.content || ''));
    else contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '') }] });
  }
  return { system: system.join('\n\n').trim(), contents };
}

async function chat({ messages, temperature = 0.4, maxTokens = 2200, json = false, ai }) {
  const { apiKey, model, baseUrl } = ai || {};
  if (!apiKey) throw new ProviderError('Gemini API key is not set', 500);

  const { system, contents } = splitMessages(messages);
  if (!contents.length) throw new ProviderError('No user message provided to the AI');

  const body = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const url = `${(baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent`;

  // Gemini free tier intermittently returns 503 "high demand"; retry those
  // a couple of times with backoff before surfacing an error.
  let res;
  for (let attempt = 0; ; attempt += 1) {
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (err) {
      throw new ProviderError(`Could not reach the AI service (${err.message})`);
    }
    if (res.status !== 503 || attempt >= 2) break;
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message || '';
    } catch { /* ignore */ }
    // Never echo request details back — they can include the API key.
    if (res.status === 400 && /api key/i.test(detail)) throw new ProviderError('AI API key was rejected', 502);
    if (res.status === 401 || res.status === 403) throw new ProviderError('AI API key was rejected', 502);
    if (res.status === 404) throw new ProviderError(`AI model "${model}" was not found at the provider`, 502);
    if (res.status === 429) throw new ProviderError('AI provider rate limit reached, try again shortly', 502);
    throw new ProviderError(`AI provider error ${res.status}${detail ? `: ${String(detail).slice(0, 200)}` : ''}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) throw new ProviderError('The AI provider declined this request (content blocked)', 502);
  const content = (candidate?.content?.parts || [])
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('');
  if (!content.trim()) throw new ProviderError('AI provider returned an empty response');
  return content;
}

module.exports = { chat, ProviderError };
