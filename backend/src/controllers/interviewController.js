const prisma = require('../config/prisma');
const ai = require('../ai');
const { badRequest, notFound, forbidden } = require('../utils/errors');
const { ok, created } = require('../utils/response');
const { clampInt, safeJsonParse } = require('../utils/validate');
const { ActivityType } = require('../utils/enums');

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

async function start(req, res, next) {
  try {
    if (!(await ai.isConfigured())) throw new ai.AiNotConfiguredError();
    const { role, domain, difficulty, rounds } = req.body || {};
    if (!role || !String(role).trim()) throw badRequest('Role is required');
    if (!domain || !String(domain).trim()) throw badRequest('Domain is required');
    const diff = DIFFICULTIES.includes(String(difficulty).toUpperCase()) ? String(difficulty).toUpperCase() : 'MEDIUM';
    const totalRounds = clampInt(rounds, 3, 10, 5);

    const session = await prisma.interviewSession.create({
      data: {
        userId: req.user.id,
        role: String(role).slice(0, 120),
        domain: String(domain).slice(0, 120),
        difficulty: diff,
        totalRounds,
      },
    });

    const question = await ai.generateInterviewQuestion({ role: session.role, domain: session.domain, difficulty: diff, round: 1, previousTopics: [] });
    const exchange = await prisma.interviewExchange.create({ data: { sessionId: session.id, round: 1, question } });
    await prisma.interviewSession.update({ where: { id: session.id }, data: { currentRound: 1 } });

    return created(res, { session: publicSession(session), currentQuestion: { exchangeId: exchange.id, question } }, 'Interview started');
  } catch (err) {
    next(err);
  }
}

function publicSession(s) {
  return {
    id: s.id, role: s.role, domain: s.domain, difficulty: s.difficulty,
    status: s.status, currentRound: s.currentRound, totalRounds: s.totalRounds,
    finalScore: s.finalScore, summary: s.summary ? safeJsonParse(s.summary, null) : null,
    createdAt: s.createdAt,
  };
}

/** Submit the answer for the current round -> evaluation + next question. */
async function answer(req, res, next) {
  try {
    const { exchangeId, answer: answerText } = req.body || {};
    const session = await prisma.interviewSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) throw notFound('Interview session not found');
    if (session.userId !== req.user.id) throw forbidden();
    if (session.status === 'COMPLETED') throw badRequest('This interview has already finished');
    if (!answerText || !String(answerText).trim()) throw badRequest('Please write your answer first');

    const exchange = await prisma.interviewExchange.findUnique({ where: { id: String(exchangeId) } });
    if (!exchange || exchange.sessionId !== session.id) throw notFound('Question not found');
    if (exchange.answer) throw badRequest('This question has already been answered');

    const evaluation = await ai.evaluateInterviewAnswer({ role: session.role, question: exchange.question, answer: String(answerText) });
    await prisma.interviewExchange.update({
      where: { id: exchange.id },
      data: { answer: String(answerText).slice(0, 8000), feedback: JSON.stringify(evaluation) },
    });

    // Final round? Produce the summary.
    if (session.currentRound >= session.totalRounds) {
      const exchanges = await prisma.interviewExchange.findMany({ where: { sessionId: session.id }, orderBy: { round: 'asc' } });
      const updatedExchanges = exchanges.map((e) => e.id === exchange.id
        ? { round: e.round, question: e.question, answer: String(answerText), feedback: JSON.stringify(evaluation) }
        : { round: e.round, question: e.question, answer: e.answer, feedback: e.feedback });
      const summary = await ai.summarizeInterview({ role: session.role, exchanges: updatedExchanges });
      await prisma.interviewSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED', finalScore: summary.overallScore, summary: JSON.stringify(summary) },
      });
      await prisma.activityLog.create({
        data: { userId: req.user.id, type: ActivityType.INTERVIEW_COMPLETED, message: `Completed mock interview for ${session.role} — scored ${summary.overallScore}/100`, meta: JSON.stringify({ sessionId: session.id }) },
      });
      return ok(res, { finished: true, evaluation, summary }, 'Interview completed');
    }

    const previous = await prisma.interviewExchange.findMany({ where: { sessionId: session.id }, select: { question: true } });
    const nextQuestion = await ai.generateInterviewQuestion({
      role: session.role, domain: session.domain, difficulty: session.difficulty,
      round: session.currentRound + 1, previousTopics: previous.map((p) => p.question),
    });
    const nextExchange = await prisma.interviewExchange.create({ data: { sessionId: session.id, round: session.currentRound + 1, question: nextQuestion } });
    await prisma.interviewSession.update({ where: { id: session.id }, data: { currentRound: session.currentRound + 1 } });

    return ok(res, {
      finished: false,
      evaluation,
      currentRound: session.currentRound + 1,
      currentQuestion: { exchangeId: nextExchange.id, question: nextQuestion },
    }, 'Answer evaluated');
  } catch (err) {
    next(err);
  }
}

async function listSessions(req, res, next) {
  try {
    const sessions = await prisma.interviewSession.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return ok(res, { sessions: sessions.map(publicSession) });
  } catch (err) {
    next(err);
  }
}

async function getSession(req, res, next) {
  try {
    const session = await prisma.interviewSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw notFound('Interview session not found');
    if (session.userId !== req.user.id) throw forbidden();
    const exchanges = await prisma.interviewExchange.findMany({
      where: { sessionId: session.id },
      orderBy: { round: 'asc' },
    });
    return ok(res, {
      session: publicSession(session),
      exchanges: exchanges.map((e) => ({
        id: e.id, round: e.round, question: e.question, answer: e.answer,
        feedback: e.feedback ? safeJsonParse(e.feedback, null) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { start, answer, listSessions, getSession };
