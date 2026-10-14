import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const norm = (v, max) => String(v ?? '').trim().slice(0, max);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const MAX_QUESTIONS = 50;

/**
 * Validates and normalizes an incoming quiz payload (AI- or manually supplied)
 * into questions safe to persist. A malformed set is rejected so a broken AI
 * response can never create a broken quiz (Feature 6).
 */
const normalizeQuestions = (rawQuestions) => {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new ApiError(400, 'A quiz needs at least one question.');
  }
  if (rawQuestions.length > MAX_QUESTIONS) {
    throw new ApiError(400, `A quiz may contain at most ${MAX_QUESTIONS} questions.`);
  }
  return rawQuestions.map((q, i) => {
    const prompt = norm(q.prompt, 1000);
    if (!prompt) throw new ApiError(400, `Question ${i + 1} is missing its prompt.`);
    const options = Array.isArray(q.options) ? q.options.map((o) => norm(o, 500)).filter(Boolean) : [];
    if (options.length < 2) throw new ApiError(400, `Question ${i + 1} needs at least two options.`);
    const correctAnswer = norm(q.correctAnswer, 500);
    if (!correctAnswer) throw new ApiError(400, `Question ${i + 1} is missing its correct answer.`);
    // Accept either the full option text OR a letter index (A/B/C/D) that some
    // models return, mapping the letter to the concrete option.
    let canonical = options.find((o) => o.toLowerCase() === correctAnswer.toLowerCase());
    if (!canonical && /^[A-Z]$/i.test(correctAnswer)) {
      const idx = correctAnswer.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) canonical = options[idx];
    }
    if (!canonical) throw new ApiError(400, `Question ${i + 1}'s correct answer is not among its options.`);
    return { prompt, options, correctAnswer: canonical, explanation: norm(q.explanation, 2000) || null, type: 'MCQ', sequence: i };
  });
};

/** Removes answer keys so a quiz being taken cannot leak correct answers. */
const stripAnswers = (quiz) => ({
  id: quiz.id,
  title: quiz.title,
  description: quiz.description,
  difficulty: quiz.difficulty,
  source: quiz.source,
  topicId: quiz.topicId,
  createdAt: quiz.createdAt,
  questions: (quiz.questions || []).map((q) => ({
    id: q.id, prompt: q.prompt, options: q.options, type: q.type, sequence: q.sequence
  }))
});

/** Persists a validated, user-owned quiz. */
export const createQuiz = async (userId, input) => {
  const title = norm(input.title, 200) || 'Practice Quiz';
  const questions = normalizeQuestions(input.questions);
  const difficulty = norm(input.difficulty, 10).toLowerCase();
  const quiz = await prisma.quiz.create({
    data: {
      userId,
      topicId: input.topicId || null,
      title,
      description: norm(input.description, 1000) || null,
      difficulty: DIFFICULTIES.has(difficulty) ? difficulty : null,
      source: input.source === 'MANUAL' ? 'MANUAL' : 'AI',
      questions: { createMany: { data: questions } }
    },
    include: { questions: { orderBy: { sequence: 'asc' } } }
  });
  return { ...stripAnswers(quiz), questionCount: quiz.questions.length };
};

/** Loads a quiz for a student to attempt, enforcing ownership. */
export const getQuizForAttempt = async (userId, quizId) => {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, userId },
    include: { questions: { orderBy: { sequence: 'asc' } } }
  });
  if (!quiz) throw new ApiError(404, 'Quiz not found.');
  return stripAnswers(quiz);
};


/**
 * Scores a submitted attempt server-side. The client never supplies a score;
 * correctness is computed by comparing each answer to the stored key, so the
 * result cannot be forged from the browser (Feature 6).
 */
export const submitAttempt = async (userId, quizId, submittedAnswers) => {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, userId },
    include: { questions: { orderBy: { sequence: 'asc' } } }
  });
  if (!quiz) throw new ApiError(404, 'Quiz not found.');
  if (quiz.questions.length === 0) throw new ApiError(422, 'This quiz has no questions to score.');

  const answersById = new Map();
  const list = Array.isArray(submittedAnswers) ? submittedAnswers : [];
  for (const entry of list) {
    if (entry && entry.questionId !== undefined) answersById.set(String(entry.questionId), norm(entry.answer, 500));
  }

  let score = 0;
  const review = quiz.questions.map((q) => {
    const given = answersById.get(q.id) ?? '';
    const correct = given !== '' && given.toLowerCase() === String(q.correctAnswer).toLowerCase();
    if (correct) score += 1;
    return { questionId: q.id, prompt: q.prompt, options: q.options, yourAnswer: given || null, correctAnswer: q.correctAnswer, correct, explanation: q.explanation };
  });

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId, quizId, score, totalQuestions: quiz.questions.length,
      answers: review.map((r) => ({ questionId: r.questionId, answer: r.yourAnswer, correct: r.correct })),
      submittedAt: new Date()
    }
  });

  await prisma.activityLog.create({
    data: { userId, type: 'QUIZ_SUBMITTED', score, total: quiz.questions.length, meta: { quizId } }
  });

  return {
    attempt: { id: attempt.id, quizId, score, totalQuestions: quiz.questions.length, submittedAt: attempt.submittedAt },
    percentage: Math.round((score / quiz.questions.length) * 1000) / 10,
    review
  };
};

export const listAttempts = async (userId) =>
  prisma.quizAttempt.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: 50,
    include: { quiz: { select: { id: true, title: true, difficulty: true, topicId: true } } }
  });

export const listQuizzes = async (userId) =>
  prisma.quiz.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { questions: true, attempts: true } } }
  });
