import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

// AI Mock Interview (Feature 10). Questions are generated from the target role
// and type (AI when configured, otherwise a rule-based bank). Answers are
// evaluated with a transparent keyword/length rubric. Scores are explicitly NOT
// hiring predictions.

const TYPES = new Set(['technical', 'hr', 'behavioral', 'mixed']);
const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'are', 'how', 'what', 'why', 'does', 'can', 'describe', 'explain', 'about']);

const ruleBasedQuestions = (role, type, count) => {
  const bank = {
    technical: [
      `Explain a challenging ${role} problem you solved and your approach.`,
      `How do you debug a production issue related to ${role}?`,
      `Describe how you would design a scalable system for a ${role} task.`,
      `What testing strategies do you use in ${role} work?`,
      `Walk through how you optimize performance in a ${role} context.`
    ],
    hr: [
      'Tell me about yourself and why this role interests you.',
      'Describe a time you handled conflicting priorities.',
      'Where do you see yourself in two years?',
      'What is your greatest strength and one area you are improving?'
    ],
    behavioral: [
      'Describe a time you worked in a team under pressure.',
      'Tell me about a failure and what you learned from it.',
      'How do you handle feedback you disagree with?',
      'Give an example of you taking initiative.'
    ]
  };
  const pool = type === 'mixed' ? [...bank.technical, ...bank.hr, ...bank.behavioral] : (bank[type] || bank.technical);
  return pool.slice(0, Math.max(1, Math.min(10, count || 5))).map((prompt, i) => ({ id: `q${i + 1}`, prompt }));
};

const keywordsOf = (prompt) =>
  String(prompt).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4 && !STOPWORDS.has(w)).slice(0, 8);

/**
 * Transparent rubric per answer: substance (length) up to 40 points and
 * concept coverage (expected keywords present) up to 60 points.
 */
const evaluateAnswer = (question, answer) => {
  const text = String(answer || '').trim();
  const lower = text.toLowerCase();
  const lengthScore = text.length === 0 ? 0 : text.length >= 120 ? 40 : text.length >= 40 ? 25 : 10;
  const keywords = keywordsOf(question.prompt);
  const present = keywords.filter((k) => lower.includes(k));
  const coverage = keywords.length === 0 ? 60 : Math.round((present.length / keywords.length) * 60);
  const missing = keywords.filter((k) => !lower.includes(k));
  const score = Math.min(100, lengthScore + coverage);
  const suggestions = [];
  if (text.length < 40) suggestions.push('Give a more complete answer with specifics and examples.');
  if (missing.length > 0) suggestions.push(`Consider addressing: ${missing.join(', ')}.`);
  if (text.length >= 120 && missing.length === 0) suggestions.push('Strong, well-covered answer.');
  return { questionId: question.id, prompt: question.prompt, score, present, missing, suggestions };
};

export const startInterview = async (userId, { role, skills, interviewType, count }) => {
  const roleName = String(role || '').trim();
  if (!roleName) throw new ApiError(400, 'A target role is required.');
  const type = TYPES.has(String(interviewType || '').toLowerCase()) ? String(interviewType).toLowerCase() : 'technical';
  const skillList = Array.isArray(skills) ? skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 20) : [];

  let questions = [];
  let provider = 'rule-based';
  try {
    const { aiStatus, generateMockInterview } = await import('./aiService.js');
    if (aiStatus().configured.length > 0) {
      const ai = await generateMockInterview({ role: roleName, domain: skillList.join(', ') || type, difficulty: 'medium' });
      if (Array.isArray(ai.questions) && ai.questions.length > 0) {
        questions = ai.questions.slice(0, 10).map((q, i) => ({ id: `q${i + 1}`, prompt: String(q.prompt || q).slice(0, 500) }));
        provider = ai.provider || 'ai';
      }
    }
  } catch { /* fall back to rule-based bank */ }
  if (questions.length === 0) questions = ruleBasedQuestions(roleName, type, count);

  return prisma.interviewSession.create({
    data: {
      userId, role: roleName.slice(0, 120), skills: skillList, interviewType: type,
      status: 'IN_PROGRESS', questions, provider
    }
  });
};

export const evaluateInterview = async (userId, sessionId, answers) => {
  const session = await prisma.interviewSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new ApiError(404, 'Interview session not found.');
  const questions = Array.isArray(session.questions) ? session.questions : [];
  if (questions.length === 0) throw new ApiError(422, 'This interview has no questions.');

  const byId = new Map((Array.isArray(answers) ? answers : []).map((a) => [String(a.questionId), a.answer]));
  const perQuestion = questions.map((q) => evaluateAnswer(q, byId.get(q.id)));
  const overall = Math.round(perQuestion.reduce((s, r) => s + r.score, 0) / perQuestion.length);

  const feedback = {
    overall,
    disclaimer: 'This rubric score reflects answer structure and concept coverage only. It is not a prediction of hiring outcomes.',
    perQuestion,
    missingConcepts: [...new Set(perQuestion.flatMap((r) => r.missing))].slice(0, 20),
    suggestions: perQuestion.flatMap((r) => r.suggestions).slice(0, 20)
  };

  return prisma.interviewSession.update({
    where: { id: session.id },
    data: { status: 'COMPLETED', score: overall, feedback }
  });
};

export const listInterviews = async (userId) =>
  prisma.interviewSession.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

export const getInterview = async (userId, id) => {
  const session = await prisma.interviewSession.findFirst({ where: { id, userId } });
  if (!session) throw new ApiError(404, 'Interview session not found.');
  return session;
};
