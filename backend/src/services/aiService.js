import { env } from '../config/env.js';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-2.5-flash';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = env.GROQ_MODEL || 'llama-3.1-8b-instant';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_DEEPSEEK_MODEL = env.DEEPSEEK_MODEL || 'deepseek-chat';

// ─── Prompt Builder ───────────────────────────────────────────────────────────
export const buildPrompt = (type, payload = {}) => {
  const systemInstruction = [
    'You are ZERA, an AI-powered personalized learning assistant for students.',
    'Provide clear, accurate, educational, and structured responses.',
    'Always be encouraging, practical, and concise.'
  ].join('\n');

  switch (type) {
    case 'doubt-solver':
      return {
        system: systemInstruction,
        user: [
          `Style requested: ${payload.style || 'simple'}`,
          `Student Question: ${payload.question || ''}`,
          '',
          'Provide a helpful explanation with definition, key concepts, and an example.'
        ].join('\n')
      };

    case 'notes-generator':
      return {
        system: systemInstruction,
        user: [
          `Topic: ${payload.topic || 'General Subject'}`,
          `Context: ${payload.context || 'Revision notes'}`,
          `Level: ${payload.level || 'Beginner'}`,
          '',
          'Generate high-yield revision notes with: Key Takeaways, Core Concepts, Bullet Points, and a Brief Summary.'
        ].join('\n')
      };

    case 'quiz-generator':
      return {
        system: systemInstruction + ' Output ONLY valid JSON without markdown fences or extra text.',
        user: [
          `Topic: ${payload.topic || 'General Knowledge'}`,
          `Difficulty: ${payload.difficulty || 'medium'}`,
          `Number of questions: ${payload.count || 3}`,
          '',
          'Generate a quiz matching this JSON format exactly:',
          '{"title":"Quiz Title","questions":[{"prompt":"Question text?","options":["A","B","C","D"],"correctAnswer":"A","explanation":"Why A is correct"}]}'
        ].join('\n')
      };

    case 'study-plan':
      return {
        system: systemInstruction + ' Output ONLY valid JSON without markdown fences or extra text.',
        user: [
          `Course: ${payload.course || 'Core Subjects'}`,
          `Target duration: ${payload.targetDate || '14 days'}`,
          `Daily hours: ${payload.hours || 2}`,
          `Weak areas: ${payload.weakTopic || 'Fundamentals'}`,
          '',
          'Generate a personalized study plan matching this JSON format exactly:',
          '{"title":"Study Plan Title","description":"Plan overview","schedule":[{"title":"Day/Block Title","time":"2 hours","detail":"Specific revision goals and practice tasks"}]}'
        ].join('\n')
      };

    case 'mock-interview':
      return {
        system: systemInstruction + ' Output ONLY valid JSON without markdown fences or extra text.',
        user: [
          `Role: ${payload.role || 'Junior Software Engineer'}`,
          `Domain: ${payload.domain || 'Data Structures and Algorithms'}`,
          `Difficulty: ${payload.difficulty || 'medium'}`,
          '',
          'Generate 4 targeted interview questions with tips matching this JSON format exactly:',
          '{"title":"Interview Title","questions":[{"question":"Question text?","tip":"How to answer using STAR method"}]}'
        ].join('\n')
      };

    case 'syllabus-analysis':
      return {
        system: systemInstruction + ' Output ONLY valid JSON without markdown fences or extra text.',
        user: [
          'Analyze the following student syllabus text and extract key learning modules, chapters, and topics.',
          'Text:',
          String(payload.text || '').slice(0, 8000),
          '',
          'Return this JSON structure:',
          '{"courseTitle":"Suggested Course Title","summary":"Overview of the curriculum","modules":[{"title":"Module 1","topics":["Topic 1","Topic 2"]}],"recommendedStudyWeeks":6}'
        ].join('\n')
      };

    default:
      return {
        system: systemInstruction,
        user: String(payload.prompt || 'Provide a helpful study response.')
      };
  }
};

// ─── JSON Parser Helper ───────────────────────────────────────────────────────
export const parseAiJson = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) return null;

  // Strip markdown code block wrappers if present (e.g. ```json ... ```)
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
};

// ─── Gemini Provider Call ─────────────────────────────────────────────────────
const callGemini = async (promptObj) => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const combinedPrompt = `${promptObj.system}\n\n${promptObj.user}`;
  // The key goes in the `x-goog-api-key` header rather than the query string: a
  // URL can be captured by access logs, a header generally is not.
  const url = `${GEMINI_BASE_URL}/${DEFAULT_GEMINI_MODEL}:generateContent`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: combinedPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500
        }
      })
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = payload?.error?.message || `Gemini returned HTTP ${res.status}`;
      throw new Error(msg);
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!text.trim()) {
      throw new Error('Gemini returned an empty response.');
    }

    return text.trim();
  } finally {
    clearTimeout(timeoutId);
  }
};

// ─── Groq Provider Call ───────────────────────────────────────────────────────
/**
 * Shared caller for every provider that speaks the OpenAI
 * `/chat/completions` dialect (Groq, OpenRouter, DeepSeek). The key is only
 * ever placed in the Authorization header, never in a URL, so it cannot leak
 * into a log line or a proxy access log.
 */
const callOpenAiCompatible = async ({ baseUrl, apiKey, model, label, extraHeaders = {} }, promptObj) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: promptObj.system },
          { role: 'user', content: promptObj.user }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      // Provider error bodies can echo the request; only the message is kept and
      // the global handler replaces 5xx text before it reaches a client.
      const msg = payload?.error?.message || `${label} returned HTTP ${res.status}`;
      throw new Error(msg);
    }

    const text = payload?.choices?.[0]?.message?.content || '';
    if (!text.trim()) {
      throw new Error(`${label} returned an empty response.`);
    }

    return text.trim();
  } finally {
    clearTimeout(timeoutId);
  }
};

const callGroq = async (promptObj) =>
  callOpenAiCompatible({
    baseUrl: GROQ_BASE_URL,
    apiKey: env.GROQ_API_KEY,
    model: DEFAULT_GROQ_MODEL,
    label: 'Groq'
  }, promptObj);

const callOpenRouter = async (promptObj) =>
  callOpenAiCompatible({
    baseUrl: OPENROUTER_BASE_URL,
    apiKey: env.OPENROUTER_API_KEY,
    model: DEFAULT_OPENROUTER_MODEL,
    label: 'OpenRouter',
    // OpenRouter uses these for dashboard attribution; both are optional.
    extraHeaders: {
      'HTTP-Referer': env.CLIENT_URL,
      'X-Title': 'ZERA Learning Platform'
    }
  }, promptObj);

const callDeepSeek = async (promptObj) =>
  callOpenAiCompatible({
    baseUrl: DEEPSEEK_BASE_URL,
    apiKey: env.DEEPSEEK_API_KEY,
    model: DEFAULT_DEEPSEEK_MODEL,
    label: 'DeepSeek'
  }, promptObj);

const TOGETHER_BASE_URL = 'https://api.together.xyz/v1/chat/completions';
const DEFAULT_TOGETHER_MODEL = env.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70b-Instruct-Turbo';

const callTogether = async (promptObj) =>
  callOpenAiCompatible({
    baseUrl: TOGETHER_BASE_URL,
    apiKey: env.TOGETHER_API_KEY,
    model: DEFAULT_TOGETHER_MODEL,
    label: 'Together AI'
  }, promptObj);

const HUGGINGFACE_BASE_URL = 'https://api-inference.huggingface.co/v1/chat/completions';
const DEFAULT_HUGGINGFACE_MODEL = env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';

const callHuggingFace = async (promptObj) =>
  callOpenAiCompatible({
    baseUrl: HUGGINGFACE_BASE_URL,
    apiKey: env.HUGGINGFACE_API_KEY,
    model: DEFAULT_HUGGINGFACE_MODEL,
    label: 'HuggingFace'
  }, promptObj);

const CLOUDFLARE_BASE_URL = 'https://api.cloudflare.com/client/v4/ai/run';
const DEFAULT_CLOUDFLARE_MODEL = env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fp8';

const callCloudflare = async (promptObj) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const res = await fetch(CLOUDFLARE_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.CLOUDFLARE_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: DEFAULT_CLOUDFLARE_MODEL,
        messages: [
          { role: 'system', content: promptObj.system },
          { role: 'user', content: promptObj.user }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = payload?.error?.message || `Cloudflare returned HTTP ${res.status}`;
      throw new Error(msg);
    }

    const text = payload?.result?.response || '';
    if (!text.trim()) {
      throw new Error('Cloudflare returned an empty response.');
    }

    return text.trim();
  } finally {
    clearTimeout(timeoutId);
  }
};

const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1/chat/completions';
const DEFAULT_MISTRAL_MODEL = env.MISTRAL_MODEL || 'mistral-large-latest';

const callMistral = async (promptObj) =>
  callOpenAiCompatible({
    baseUrl: MISTRAL_BASE_URL,
    apiKey: env.MISTRAL_API_KEY,
    model: DEFAULT_MISTRAL_MODEL,
    label: 'Mistral'
  }, promptObj);

const COHERE_BASE_URL = 'https://api.cohere.ai/v2/chat';
const DEFAULT_COHERE_MODEL = env.COHERE_MODEL || 'command-r-08-2024';

const callCohere = async (promptObj) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const res = await fetch(COHERE_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.COHERE_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: DEFAULT_COHERE_MODEL,
        messages: [
          { role: 'system', content: promptObj.system },
          { role: 'user', content: promptObj.user }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = payload?.message || payload?.error?.message || `Cohere returned HTTP ${res.status}`;
      throw new Error(msg);
    }

    const text = payload?.text || '';
    if (!text.trim()) {
      throw new Error('Cohere returned an empty response.');
    }

    return text.trim();
  } finally {
    clearTimeout(timeoutId);
  }
};

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_NVIDIA_MODEL = env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct';

const callNvidia = async (promptObj) =>
  callOpenAiCompatible({
    baseUrl: NVIDIA_BASE_URL,
    apiKey: env.NVIDIA_API_KEY,
    model: DEFAULT_NVIDIA_MODEL,
    label: 'NVIDIA'
  }, promptObj);

/**
 * The failover chain, most-preferred first.
 *
 * ElevenLabs is intentionally absent: it provides text-to-speech, so it cannot
 * serve a text completion and including it would only add a guaranteed failure.
 * The `xpl_` credentials are also absent because no confirmed base URL exists
 * for them; guessing a host would risk sending a secret to the wrong service.
 */
const PROVIDERS = [
  {
    id: 'gemini',
    apiKey: env.GEMINI_API_KEY,
    model: DEFAULT_GEMINI_MODEL,
    call: callGemini
  },
  {
    id: 'groq',
    apiKey: env.GROQ_API_KEY,
    model: DEFAULT_GROQ_MODEL,
    call: callGroq
  },
  {
    id: 'openrouter',
    apiKey: env.OPENROUTER_API_KEY,
    model: DEFAULT_OPENROUTER_MODEL,
    call: callOpenRouter
  },
  {
    id: 'deepseek',
    apiKey: env.DEEPSEEK_API_KEY,
    model: DEFAULT_DEEPSEEK_MODEL,
    call: callDeepSeek
  },
  {
    id: 'together',
    apiKey: env.TOGETHER_API_KEY,
    model: DEFAULT_TOGETHER_MODEL,
    call: callTogether
  },
  {
    id: 'huggingface',
    apiKey: env.HUGGINGFACE_API_KEY,
    model: DEFAULT_HUGGINGFACE_MODEL,
    call: callHuggingFace
  },
  {
    id: 'cloudflare',
    apiKey: env.CLOUDFLARE_API_KEY,
    model: DEFAULT_CLOUDFLARE_MODEL,
    call: callCloudflare
  },
  {
    id: 'mistral',
    apiKey: env.MISTRAL_API_KEY,
    model: DEFAULT_MISTRAL_MODEL,
    call: callMistral
  },
  {
    id: 'cohere',
    apiKey: env.COHERE_API_KEY,
    model: DEFAULT_COHERE_MODEL,
    call: callCohere
  },
  {
    id: 'nvidia',
    apiKey: env.NVIDIA_API_KEY,
    model: DEFAULT_NVIDIA_MODEL,
    call: callNvidia
  }
];

// ─── Primary / Fallback Orchestrator ──────────────────────────────────────────
/**
 * Providers are tried in order and the first success wins. Order reflects
 * preference, not correctness: any provider that is configured can serve any of
 * the actions, so removing a key from the environment silently demotes it
 * without breaking the feature.
 */
/** Shared by both orchestrators so the "nothing configured" path is identical. */
const availableProviders = () => {
  const available = PROVIDERS.filter((provider) => provider.apiKey);

  if (available.length === 0) {
    const error = new Error(
      'AI features are not configured. Set at least one provider key in the backend environment.'
    );
    error.statusCode = 503;
    throw error;
  }

  return available;
};

const allFailed = (errors) => {
  const failureError = new Error(
    `AI generation failed across configured providers: ${errors.join('; ')}`
  );
  failureError.statusCode = 502;
  return failureError;
};

export const executeAiPrompt = async (promptObj) => {
  const errors = [];

  for (const provider of availableProviders()) {
    try {
      const text = await provider.call(promptObj);
      return { text, provider: provider.id, model: provider.model };
    } catch (err) {
      // Only the message is recorded; the key never appears in an error.
      errors.push(`${provider.id}: ${err.message}`);
    }
  }

  throw allFailed(errors);
};

/**
 * Orchestrator for actions that need a specific JSON shape.
 *
 * `validate` runs per provider, not once at the end. A model that answers
 * conversationally instead of emitting JSON is a failure of *that provider*, so
 * it must fail over like any other error. Validating only after the chain had
 * already committed to the first reply let one chatty primary model defeat the
 * entire failover design.
 */
export const executeStructuredPrompt = async (promptObj, validate) => {
  const errors = [];

  for (const provider of availableProviders()) {
    let text;
    try {
      text = await provider.call(promptObj);
    } catch (err) {
      errors.push(`${provider.id}: ${err.message}`);
      continue;
    }

    const parsed = parseAiJson(text);

    if (!parsed) {
      errors.push(`${provider.id}: returned a response that was not valid JSON`);
      continue;
    }

    const problem = validate(parsed);
    if (problem) {
      errors.push(`${provider.id}: ${problem}`);
      continue;
    }

    return { data: parsed, provider: provider.id, model: provider.model, text };
  }

  throw allFailed(errors);
};

// ─── AI Status Check ──────────────────────────────────────────────────────────
export const aiStatus = () => {
  const configured = PROVIDERS.filter((provider) => provider.apiKey);
  const chain = configured.map((provider) => provider.id).join(' -> ');

  return {
    enabled: configured.length > 0,
    activeProvider: chain || 'none',
    providers: PROVIDERS.reduce((acc, provider) => {
      acc[provider.id] = { configured: Boolean(provider.apiKey), model: provider.model };
      return acc;
    }, {}),
    message: configured.length > 0
      ? `AI is operational. Failover order: ${chain}.`
      : 'No AI provider API key found. Set at least one provider key in backend/.env to enable live AI.'
  };
};

// ─── Public Action Handlers ───────────────────────────────────────────────────
export const generateDoubtAnswer = async ({ question, style }) => {
  if (!question || !String(question).trim()) {
    const err = new Error('Question text is required.');
    err.statusCode = 400;
    throw err;
  }
  const prompt = buildPrompt('doubt-solver', { question, style });
  const result = await executeAiPrompt(prompt);
  return { answer: result.text, provider: result.provider };
};

export const generateStudyNote = async ({ topic, context, level }) => {
  const prompt = buildPrompt('notes-generator', { topic, context, level });
  const result = await executeAiPrompt(prompt);
  return {
    title: String(topic || 'Study Note').trim().slice(0, 120),
    content: result.text,
    provider: result.provider
  };
};

export const generateQuiz = async ({ topic, difficulty, count }) => {
<<<<<<< HEAD
  const prompt = buildPrompt('quiz-generator', { topic, difficulty, count });

  const result = await executeStructuredPrompt(prompt, (parsed) => {
    if (!Array.isArray(parsed.questions)) return 'quiz response had no "questions" array';
    if (parsed.questions.length === 0) return 'quiz response contained zero questions';
    return null;
  });

  return { ...result.data, provider: result.provider };
};

export const generateStudyPlan = async ({ course, targetDate, hours, weakTopic }) => {
  const prompt = buildPrompt('study-plan', { course, targetDate, hours, weakTopic });

  const result = await executeStructuredPrompt(prompt, (parsed) => {
    if (!Array.isArray(parsed.schedule)) return 'study plan response had no "schedule" array';
    if (parsed.schedule.length === 0) return 'study plan response contained no schedule entries';
    return null;
  });

  return { ...result.data, provider: result.provider };
};

export const generateMockInterview = async ({ role, domain, difficulty }) => {
  const prompt = buildPrompt('mock-interview', { role, domain, difficulty });

  const result = await executeStructuredPrompt(prompt, (parsed) => {
    if (!Array.isArray(parsed.questions)) return 'mock interview response had no "questions" array';
    if (parsed.questions.length === 0) return 'mock interview response contained zero questions';
    return null;
  });

  return { ...result.data, provider: result.provider };
};

export const analyzeSyllabusWithAi = async (text) => {
  if (!text || !String(text).trim()) {
    const err = new Error('Syllabus text is required for AI analysis.');
    err.statusCode = 400;
    throw err;
  }
  const prompt = buildPrompt('syllabus-analysis', { text });

  // A syllabus analysis is advisory rather than strictly shaped: the raw text is
  // still a legitimate answer, so only a wholly unparseable response fails over.
  const result = await executeStructuredPrompt(prompt, (parsed) => {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return 'syllabus analysis was not a JSON object';
    }
    return null;
  });

  return {
    analysis: result.data,
    provider: result.provider
  };
=======
  const response = await getGeminiText(buildPrompt('quiz-generator', { topic, difficulty, count }));
  const parsed = parseJson(response);
  if (!parsed?.title || !Array.isArray(parsed.questions) || !parsed.questions.length) throw new Error('The AI provider returned an invalid quiz format.');
  return parsed;
};

export const generateStudyPlan = async ({ course, targetDate, hours, weakTopic }) => {
  const response = await getGeminiText(buildPrompt('study-plan', { course, targetDate, hours, weakTopic }));
  const parsed = parseJson(response);
  if (!parsed?.title || !parsed.description || !Array.isArray(parsed.schedule)) throw new Error('The AI provider returned an invalid study-plan format.');
  return parsed;
};

export const generateMockInterview = async ({ role, domain, difficulty }) => {
  const response = await getGeminiText(buildPrompt('mock-interview', { role, domain, difficulty }));
  const parsed = parseJson(response);
  if (!parsed?.title || !Array.isArray(parsed.questions) || !parsed.questions.length) throw new Error('The AI provider returned an invalid interview format.');
  return parsed;
>>>>>>> 4804780593c11e68ae22b39c559dc624c40d29a7
};
