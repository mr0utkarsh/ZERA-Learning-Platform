import { env } from '../config/env.js';

const extractJson = (text) => {
  const cleaned = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
};

export const generateContent = async (prompt) => {
  if (!env.GEMINI_API_KEY) {
    const error = new Error('AI service is not configured. Set GEMINI_API_KEY on the backend.');
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.4 } })
  });
  
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'AI request failed.');
    error.statusCode = 502;
    throw error;
  }
  
  const text = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
  return text;
};

export const generateAssessmentQuestions = async ({ topic, difficulty }) => {
  const prompt = `Create exactly 5 ${difficulty || 'intermediate'} multiple-choice interview questions about ${topic}. Return JSON only in this shape: {"title":"string","questions":[{"prompt":"string","options":["string","string","string","string"],"correctAnswer":"one option copied exactly","explanation":"string"}]}. Questions must be distinct, accurate, and have exactly four choices.`;
  
  const text = await generateContent(prompt);
  let generated;
  try { generated = extractJson(text); } catch { const error = new Error('Gemini returned an invalid assessment format.'); error.statusCode = 502; throw error; }
  
  if (!generated?.title || !Array.isArray(generated.questions) || generated.questions.length !== 5 || generated.questions.some(question => !question.prompt || !Array.isArray(question.options) || question.options.length !== 4 || !question.options.includes(question.correctAnswer))) {
    const error = new Error('Gemini returned incomplete assessment questions.'); error.statusCode = 502; throw error;
  }
  return generated;
};
