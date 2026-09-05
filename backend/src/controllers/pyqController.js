const prisma = require('../config/prisma');
const ai = require('../ai');
const { badRequest, notFound } = require('../utils/errors');
const { ok } = require('../utils/response');
const { clampInt } = require('../utils/validate');
const { ActivityType } = require('../utils/enums');

/** Browse/search/filter PYQs, with the student's attempt/bookmark state. */
async function list(req, res, next) {
  try {
    const page = clampInt(req.query.page, 1, 1000, 1);
    const pageSize = clampInt(req.query.limit, 1, 50, 20);
    const where = {};
    if (req.query.subject) where.subjectName = { contains: String(req.query.subject) };
    if (req.query.year) where.year = clampInt(req.query.year, 1990, 2100, undefined);
    if (req.query.exam) where.exam = { contains: String(req.query.exam) };
    if (req.query.topic) where.topic = { contains: String(req.query.topic) };
    if (req.query.difficulty) where.difficulty = String(req.query.difficulty).toUpperCase();
    if (req.query.q) where.question = { contains: String(req.query.q) };

    const [total, pyqs] = await Promise.all([
      prisma.pyq.count({ where }),
      prisma.pyq.findMany({
        where,
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const ids = pyqs.map((p) => p.id);
    const [attempts, bookmarks] = await Promise.all([
      prisma.pyqAttempt.findMany({ where: { userId: req.user.id, pyqId: { in: ids } } }),
      prisma.pyqBookmark.findMany({ where: { userId: req.user.id, pyqId: { in: ids } } }),
    ]);
    const attemptMap = new Map(attempts.map((a) => [a.pyqId, a]));
    const bookmarkSet = new Set(bookmarks.map((b) => b.pyqId));

    return ok(res, {
      total, page, pageSize,
      pyqs: pyqs.map((p) => ({
        id: p.id, subjectName: p.subjectName, year: p.year, exam: p.exam, topic: p.topic,
        difficulty: p.difficulty, question: p.question,
        // Solution hidden until attempted
        attempted: attemptMap.has(p.id),
        lastAnswer: attemptMap.get(p.id)?.answer || null,
        lastCorrect: attemptMap.get(p.id)?.correct ?? null,
        bookmarked: bookmarkSet.has(p.id),
      })),
    });
  } catch (err) {
    next(err);
  }
}

/** Submit a self-check attempt (student marks whether their answer matched). */
async function attempt(req, res, next) {
  try {
    const { answer, correct } = req.body || {};
    if (!answer || !String(answer).trim()) throw badRequest('Write your answer first');
    const pyq = await prisma.pyq.findUnique({ where: { id: req.params.id } });
    if (!pyq) throw notFound('Question not found');

    const rec = await prisma.pyqAttempt.upsert({
      where: { userId_pyqId: { userId: req.user.id, pyqId: pyq.id } },
      create: { userId: req.user.id, pyqId: pyq.id, answer: String(answer).slice(0, 5000), correct: correct === true },
      update: { answer: String(answer).slice(0, 5000), correct: correct === true },
    });
    await prisma.activityLog.create({
      data: { userId: req.user.id, type: ActivityType.PYQ_ATTEMPTED, message: `Practiced a ${pyq.year} ${pyq.subjectName} question`, meta: JSON.stringify({ pyqId: pyq.id }) },
    });
    // Reveal the official solution once attempted
    return ok(res, { attempt: rec, solution: pyq.solution }, 'Answer recorded');
  } catch (err) {
    next(err);
  }
}

async function getSolution(req, res, next) {
  try {
    const pyq = await prisma.pyq.findUnique({ where: { id: req.params.id } });
    if (!pyq) throw notFound('Question not found');
    const attempted = await prisma.pyqAttempt.findUnique({ where: { userId_pyqId: { userId: req.user.id, pyqId: pyq.id } } });
    if (!attempted) throw badRequest('Attempt the question first to unlock the solution');
    return ok(res, { solution: pyq.solution });
  } catch (err) {
    next(err);
  }
}

async function toggleBookmark(req, res, next) {
  try {
    const pyq = await prisma.pyq.findUnique({ where: { id: req.params.id } });
    if (!pyq) throw notFound('Question not found');
    const existing = await prisma.pyqBookmark.findUnique({ where: { userId_pyqId: { userId: req.user.id, pyqId: pyq.id } } });
    if (existing) {
      await prisma.pyqBookmark.delete({ where: { id: existing.id } });
      return ok(res, { bookmarked: false });
    }
    await prisma.pyqBookmark.create({ data: { userId: req.user.id, pyqId: pyq.id } });
    return ok(res, { bookmarked: true });
  } catch (err) {
    next(err);
  }
}

async function listBookmarks(req, res, next) {
  try {
    const bookmarks = await prisma.pyqBookmark.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { pyq: true },
      take: 100,
    });
    return ok(res, { bookmarks: bookmarks.map((b) => ({ id: b.pyq.id, subjectName: b.pyq.subjectName, year: b.pyq.year, exam: b.pyq.exam, topic: b.pyq.topic, question: b.pyq.question })) });
  } catch (err) {
    next(err);
  }
}

/** AI explanation for a PYQ (on-demand, clearly optional). */
async function explain(req, res, next) {
  try {
    const pyq = await prisma.pyq.findUnique({ where: { id: req.params.id } });
    if (!pyq) throw notFound('Question not found');
    const explanation = await ai.solveDoubt({
      question: `Explain how to solve this previous-year question, step by step:\n${pyq.question}`,
      history: [],
      context: `Subject: ${pyq.subjectName}. Exam: ${pyq.exam || 'university exam'} (${pyq.year}). Topic: ${pyq.topic || 'general'}.`,
    });
    return ok(res, { explanation });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, attempt, getSolution, toggleBookmark, listBookmarks, explain };
