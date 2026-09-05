const prisma = require('../config/prisma');
const ai = require('../ai');
const { badRequest, notFound, forbidden } = require('../utils/errors');
const { ok, created } = require('../utils/response');
const { clampInt, safeJsonParse } = require('../utils/validate');
const { ActivityType } = require('../utils/enums');

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

/** Generate a quiz (or mock test question set) with the AI and store it. */
async function generate(req, res, next) {
  try {
    const { subject, scope, difficulty, count, type } = req.body || {};
    if (!subject || !String(subject).trim()) throw badRequest('Subject is required');
    const diff = DIFFICULTIES.includes(String(difficulty).toUpperCase()) ? String(difficulty).toUpperCase() : 'MEDIUM';
    const isMock = type === 'MOCK_TEST';
    const n = clampInt(count, 3, isMock ? 30 : 20, isMock ? 15 : 10);

    const questions = await ai.generateQuiz({
      subject: String(subject).slice(0, 200),
      scope: scope ? String(scope).slice(0, 200) : null,
      difficulty: diff,
      count: n,
      type: isMock ? 'MOCK_TEST' : 'QUIZ',
    });

    const quiz = await prisma.quiz.create({
      data: {
        userId: req.user.id,
        title: isMock
          ? `Mock Test — ${subject}${scope ? ` (${scope})` : ''}`
          : `Quiz — ${subject}${scope ? ` (${scope})` : ''}`,
        type: isMock ? 'MOCK_TEST' : 'QUIZ',
        subjectName: String(subject).slice(0, 200),
        scopeName: scope ? String(scope).slice(0, 200) : null,
        difficulty: diff,
        timeLimitMin: isMock ? clampInt(req.body.timeLimitMin, 5, 180, Math.max(10, questions.length * 2)) : null,
        questions: JSON.stringify(questions),
      },
    });
    return created(res, { quiz: publicQuiz(quiz) }, isMock ? 'Mock test generated' : 'Quiz generated');
  } catch (err) {
    next(err);
  }
}

function publicQuiz(quiz, { withAnswers = false } = {}) {
  const questions = safeJsonParse(quiz.questions, []).map((q, i) => {
    const base = { index: i, type: q.type, text: q.text };
    if (q.type === 'SHORT_ANSWER') {
      if (withAnswers) base.modelAnswer = q.modelAnswer;
      return base;
    }
    base.choices = q.choices;
    if (withAnswers) base.correctIndex = q.correctIndex;
    if (withAnswers) base.explanation = q.explanation;
    return base;
  });
  return {
    id: quiz.id,
    title: quiz.title,
    type: quiz.type,
    subjectName: quiz.subjectName,
    scopeName: quiz.scopeName,
    difficulty: quiz.difficulty,
    timeLimitMin: quiz.timeLimitMin,
    questionCount: questions.length,
    questions,
    createdAt: quiz.createdAt,
  };
}

async function listQuizzes(req, res, next) {
  try {
    const type = req.query.type === 'MOCK_TEST' ? 'MOCK_TEST' : req.query.type === 'QUIZ' ? 'QUIZ' : undefined;
    const quizzes = await prisma.quiz.findMany({
      where: { userId: req.user.id, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { attempts: true } } },
    });
    return ok(res, {
      quizzes: quizzes.map((q) => ({
        id: q.id, title: q.title, type: q.type, subjectName: q.subjectName, scopeName: q.scopeName,
        difficulty: q.difficulty, timeLimitMin: q.timeLimitMin,
        questionCount: safeJsonParse(q.questions, []).length,
        attempts: q._count.attempts, createdAt: q.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function getQuiz(req, res, next) {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz) throw notFound('Quiz not found');
    if (quiz.userId && quiz.userId !== req.user.id) throw forbidden('This quiz belongs to another student');
    // Answers are never included here — only after submission via the attempt review.
    return ok(res, { quiz: publicQuiz(quiz) });
  } catch (err) {
    next(err);
  }
}

async function deleteQuiz(req, res, next) {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz) throw notFound('Quiz not found');
    if (quiz.userId !== req.user.id) throw forbidden('You can only delete your own quizzes');
    await prisma.quiz.delete({ where: { id: quiz.id } });
    return ok(res, null, 'Quiz deleted');
  } catch (err) {
    next(err);
  }
}

/** Start an attempt. Supports resuming an existing IN_PROGRESS attempt. */
async function startAttempt(req, res, next) {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.quizId } });
    if (!quiz) throw notFound('Quiz not found');
    if (quiz.userId && quiz.userId !== req.user.id) throw forbidden('This quiz belongs to another student');

    const existing = await prisma.quizAttempt.findFirst({
      where: { quizId: quiz.id, userId: req.user.id, status: 'IN_PROGRESS' },
    });
    if (existing) return ok(res, { attempt: serializeAttempt(existing) }, 'Attempt in progress');

    const attempt = await prisma.quizAttempt.create({
      data: { quizId: quiz.id, userId: req.user.id, total: safeJsonParse(quiz.questions, []).length, status: 'IN_PROGRESS' },
    });
    return created(res, { attempt: serializeAttempt(attempt) }, 'Attempt started');
  } catch (err) {
    next(err);
  }
}

/** Persist answers without submitting (refresh-safe). */
async function saveAnswers(req, res, next) {
  try {
    const attempt = await prisma.quizAttempt.findUnique({ where: { id: req.params.attemptId }, include: { quiz: true } });
    if (!attempt) throw notFound('Attempt not found');
    if (attempt.userId !== req.user.id) throw forbidden();
    if (attempt.status === 'COMPLETED') throw badRequest('This attempt has already been submitted');
    const answers = req.body?.answers;
    if (!Array.isArray(answers)) throw badRequest('answers must be an array');
    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { answers: JSON.stringify(answers).slice(0, 20000) },
    });
    return ok(res, null, 'Answers saved');
  } catch (err) {
    next(err);
  }
}

/** Submit and grade the attempt. Grading is deterministic on the server. */
async function submitAttempt(req, res, next) {
  try {
    const attempt = await prisma.quizAttempt.findUnique({ where: { id: req.params.attemptId }, include: { quiz: true } });
    if (!attempt) throw notFound('Attempt not found');
    if (attempt.userId !== req.user.id) throw forbidden();
    if (attempt.status === 'COMPLETED') return ok(res, { attempt: serializeAttempt(attempt) }, 'Already submitted');

    const questions = safeJsonParse(attempt.quiz.questions, []);
    let submitted = Array.isArray(req.body?.answers) ? req.body.answers : safeJsonParse(attempt.answers, []);
    if (!Array.isArray(submitted)) submitted = [];
    submitted = submitted.slice(0, questions.length);

    let correct = 0;
    let incorrect = 0;
    let score = 0;
    const details = questions.map((q, i) => {
      const given = submitted[i];
      if (q.type === 'SHORT_ANSWER') {
        // Short answers are not auto-graded; they're shown with the model answer.
        return { index: i, given: given === undefined ? null : String(given).slice(0, 2000), autoCorrect: null };
      }
      const givenIndex = typeof given === 'number' ? given : parseInt(given, 10);
      const isCorrect = Number.isFinite(givenIndex) && givenIndex === q.correctIndex;
      if (isCorrect) { correct += 1; score += 1; }
      else incorrect += 1;
      return { index: i, given: Number.isFinite(givenIndex) ? givenIndex : null, autoCorrect: isCorrect };
    });

    const gradedTotal = questions.filter((q) => q.type !== 'SHORT_ANSWER').length;
    const timeTakenSec = clampInt(req.body?.timeTakenSec, 0, 6 * 3600, Math.round((Date.now() - attempt.startedAt.getTime()) / 1000));

    const updated = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'COMPLETED',
        answers: JSON.stringify(submitted),
        score,
        correctCount: correct,
        incorrectCount: incorrect,
        percentage: gradedTotal ? Math.round((score / gradedTotal) * 1000) / 10 : null,
        timeTakenSec,
        submittedAt: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        type: attempt.quiz.type === 'MOCK_TEST' ? ActivityType.TEST_ATTEMPTED : ActivityType.QUIZ_ATTEMPTED,
        message: `${attempt.quiz.type === 'MOCK_TEST' ? 'Completed mock test' : 'Completed quiz'} "${attempt.quiz.title}" — ${updated.percentage ?? 0}%`,
        meta: JSON.stringify({ attemptId: attempt.id }),
      },
    });

    return ok(res, { attempt: serializeAttempt(updated), details }, 'Attempt submitted');
  } catch (err) {
    next(err);
  }
}

function serializeAttempt(a) {
  return {
    id: a.id, quizId: a.quizId, status: a.status, total: a.total,
    score: a.score, percentage: a.percentage, correctCount: a.correctCount,
    incorrectCount: a.incorrectCount, timeTakenSec: a.timeTakenSec,
    answers: a.answers ? safeJsonParse(a.answers, []) : null,
    startedAt: a.startedAt, submittedAt: a.submittedAt,
  };
}

async function listAttempts(req, res, next) {
  try {
    const type = req.query.type === 'MOCK_TEST' ? 'MOCK_TEST' : req.query.type === 'QUIZ' ? 'QUIZ' : undefined;
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: req.user.id, status: 'COMPLETED', ...(type ? { quiz: { type } } : {}) },
      orderBy: { submittedAt: 'desc' },
      take: 50,
      include: { quiz: { select: { id: true, title: true, type: true, subjectName: true, difficulty: true } } },
    });
    return ok(res, { attempts: attempts.map((a) => ({ ...serializeAttempt(a), quiz: a.quiz })) });
  } catch (err) {
    next(err);
  }
}

/** Full review after submission: questions + correct answers + student answers. */
async function getAttemptReview(req, res, next) {
  try {
    const attempt = await prisma.quizAttempt.findUnique({ where: { id: req.params.id }, include: { quiz: true } });
    if (!attempt) throw notFound('Attempt not found');
    if (attempt.userId !== req.user.id) throw forbidden();
    if (attempt.status !== 'COMPLETED') throw badRequest('Submit the attempt before reviewing it');

    const questions = safeJsonParse(attempt.quiz.questions, []);
    const answers = safeJsonParse(attempt.answers, []);
    return ok(res, {
      attempt: serializeAttempt(attempt),
      quiz: { id: attempt.quiz.id, title: attempt.quiz.title, type: attempt.quiz.type, subjectName: attempt.quiz.subjectName },
      questions: questions.map((q, i) => ({
        index: i, type: q.type, text: q.text,
        choices: q.choices || undefined,
        correctIndex: q.correctIndex ?? undefined,
        explanation: q.explanation || undefined,
        modelAnswer: q.modelAnswer || undefined,
        given: answers[i] ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generate, listQuizzes, getQuiz, deleteQuiz,
  startAttempt, saveAnswers, submitAttempt, listAttempts, getAttemptReview,
};
