import { env } from '../config/env.js';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash';

const buildPrompt = (type, payload) => {
  const base = [
    'You are ZERA, a supportive student learning assistant.',
    'Return concise, clear, educational answers for a student.',
    'Do not claim you are a human. Keep the answer practical and easy to understand.'
  ];

  switch (type) {
    case 'doubt-solver':
      return [
        ...base,
        'Answer the following student question.',
        `Style: ${payload.style || 'simple'}`,
        `Question: ${payload.question || ''}`
      ].join('\n');
    case 'notes-generator':
      return [
        ...base,
        'Generate a helpful study note for the given topic.',
        `Topic: ${payload.topic || 'general study topic'}`,
        `Context: ${payload.context || 'student revision summary'}`,
        `Level: ${payload.level || 'beginner'}`
      ].join('\n');
    case 'quiz-generator':
      return [
        ...base,
        'Create a short quiz in JSON format with this exact structure:',
        '{"title":"...","questions":[{"prompt":"...","options":[...],"correctAnswer":"...","explanation":"..."}]}',
        `Topic: ${payload.topic || 'general study topic'}`,
        `Difficulty: ${payload.difficulty || 'beginner'}`,
        `Count: ${payload.count || 3}`
      ].join('\n');
    case 'study-plan':
      return [
        ...base,
        'Create a realistic study schedule in JSON format with this structure:',
        '{"title":"...","description":"...","schedule":[{"title":"...","time":"...","detail":"..."}]}',
        `Course: ${payload.course || 'ZERA Foundations'}`,
        `Target date: ${payload.targetDate || '14 days'}`,
        `Daily study hours: ${payload.hours || 2}`,
        `Weak topic: ${payload.weakTopic || 'revision loops'}`
      ].join('\n');
    case 'mock-interview':
      return [
        ...base,
        'Create a practical interview practice set in JSON format with this exact structure:',
        '{"title":"...","questions":[{"question":"...","tip":"..."}]}',
        `Role: ${payload.role || 'student'}`,
        `Domain: ${payload.domain || 'general knowledge'}`,
        `Difficulty: ${payload.difficulty || 'medium'}`
      ].join('\n');
    default:
      return [
        ...base,
        `Prompt: ${payload.prompt || 'Provide a helpful answer.'}`
      ].join('\n');
  }
};

const parseJson = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
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

const getGeminiText = async (prompt) => {
  if (!env.GEMINI_API_KEY) {
    throw new Error('AI provider is not configured. Set GEMINI_API_KEY in the backend environment to enable live AI responses.');
  }

  const response = await fetch(`${GEMINI_BASE_URL}/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1200
      }
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    const message = payload?.error?.message || 'Unable to reach the AI provider.';
    throw new Error(message);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('') || '';

  if (!text) {
    throw new Error('The AI provider returned an empty response.');
  }

  return text;
};

export const aiStatus = () => ({
  enabled: Boolean(env.GEMINI_API_KEY),
  provider: 'gemini',
  message: env.GEMINI_API_KEY
    ? 'Live Gemini AI is configured.'
    : 'GEMINI_API_KEY is not configured. AI features will remain unavailable until it is added.'
});

export const generateDoubtAnswer = async ({ question, style }) => {
  const response = await getGeminiText(buildPrompt('doubt-solver', { question, style }));
  return { answer: response.trim() };
};

export const generateStudyNote = async ({ topic, context, level }) => {
  const response = await getGeminiText(buildPrompt('notes-generator', { topic, context, level }));
  return {
    title: String(topic || 'Study note').trim().slice(0, 120),
    content: response.trim()
  };
};

export const generateQuiz = async ({ topic, difficulty, count }) => {
  const response = await getGeminiText(buildPrompt('quiz-generator', { topic, difficulty, count }));
  const parsed = parseJson(response) || {
    title: `${topic || 'Study'} quick quiz`,
    questions: [{
      prompt: `What is the main idea behind ${topic || 'this topic'}?`,
      options: ['Definition and application', 'Random guessing', 'Avoiding revision', 'Ignoring examples'],
      correctAnswer: 'Definition and application',
      explanation: 'A strong understanding combines definition with practical use.'
    }]
  };

  return parsed;
};

export const generateStudyPlan = async ({ course, targetDate, hours, weakTopic }) => {
  const response = await getGeminiText(buildPrompt('study-plan', { course, targetDate, hours, weakTopic }));
  const parsed = parseJson(response) || {
    title: `${course || 'Course'} study plan`,
    description: `A focused plan to improve ${weakTopic || 'your weak topic'} over ${targetDate || 'the next 14 days'}.`,
    schedule: [
      { title: 'Daily review', time: `${hours || 2} hours`, detail: 'Revise core concepts, weak points, and quick recall questions.' },
      { title: 'Practice block', time: '30 min', detail: 'Solve 5 to 10 focused questions from the current topic.' },
      { title: 'Mock test', time: '45 min', detail: 'Check retention and note what needs extra revision.' }
    ]
  };

  return parsed;
};

export const generateMockInterview = async ({ role, domain, difficulty }) => {
  const response = await getGeminiText(buildPrompt('mock-interview', { role, domain, difficulty }));
  const parsed = parseJson(response) || {
    title: `${role || 'Student'} interview practice`,
    questions: [{
      question: `Tell me about your understanding of ${domain || 'your current subject'}.`,
      tip: 'Answer with a clear structure: context, action, result, and what you learned.'
    }]
  };

  return parsed;
};
