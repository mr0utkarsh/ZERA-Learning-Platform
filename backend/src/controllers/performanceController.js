const prisma = require('../config/prisma');
const { ok } = require('../utils/response');
const { safeJsonParse } = require('../utils/validate');

/**
 * Performance analytics — computed entirely from real attempt data.
 * If there isn't enough data, the response says so explicitly.
 */
async function getPerformance(req, res, next) {
  try {
    const userId = req.user.id;
    const [attempts, pyqAttempts, interviews] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { userId, status: 'COMPLETED' },
        orderBy: { submittedAt: 'asc' },
        include: { quiz: { select: { title: true, type: true, subjectName: true, questions: true } } },
      }),
      prisma.pyqAttempt.findMany({ where: { userId }, include: { pyq: { select: { subjectName: true, topic: true } } } }),
      prisma.interviewSession.findMany({ where: { userId, status: 'COMPLETED' }, select: { finalScore: true, role: true, createdAt: true } }),
    ]);

    if (!attempts.length && !pyqAttempts.length && !interviews.length) {
      return ok(res, {
        performance: {
          hasData: false,
          message: 'Not enough data yet. Complete a quiz or test to see your performance.',
        },
      });
    }

    const quizzes = attempts.filter((a) => a.quiz.type === 'QUIZ');
    const tests = attempts.filter((a) => a.quiz.type === 'MOCK_TEST');

    const avg = (arr) => (arr.length ? Math.round((arr.reduce((s, a) => s + (a.percentage || 0), 0) / arr.length) * 10) / 10 : null);

    // Subject-wise performance from all graded attempts + PYQ self-checks
    const bySubject = new Map();
    const addResult = (subject, percentage) => {
      if (!subject) return;
      if (!bySubject.has(subject)) bySubject.set(subject, []);
      bySubject.get(subject).push(percentage);
    };
    for (const a of attempts) addResult(a.quiz.subjectName, a.percentage || 0);
    for (const p of pyqAttempts) addResult(p.pyq.subjectName, p.correct ? 100 : 0);

    const subjectStats = [...bySubject.entries()].map(([subject, scores]) => ({
      subject,
      attempts: scores.length,
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    })).sort((a, b) => b.average - a.average);

    const strongTopics = subjectStats.filter((s) => s.average >= 70 && s.attempts >= 1).slice(0, 5);
    const weakTopics = subjectStats.filter((s) => s.average < 60).sort((a, b) => a.average - b.average).slice(0, 5);

    // Improvement over time (bucket by attempt order)
    const timeline = attempts.map((a) => ({
      id: a.id,
      title: a.quiz.title,
      type: a.quiz.type,
      percentage: a.percentage || 0,
      date: a.submittedAt,
    }));

    const firstHalf = attempts.slice(0, Math.floor(attempts.length / 2));
    const secondHalf = attempts.slice(Math.floor(attempts.length / 2));
    const trend = attempts.length >= 4 ? Math.round((avg(secondHalf) - avg(firstHalf)) * 10) / 10 : null;

    // Recent quiz accuracy details for charts
    const recent = attempts.slice(-20).map((a) => ({
      id: a.id, type: a.quiz.type, subject: a.quiz.subjectName,
      percentage: a.percentage || 0, correct: a.correctCount, incorrect: a.incorrectCount,
      date: a.submittedAt,
    }));

    return ok(res, {
      performance: {
        hasData: true,
        summary: {
          totalAttempts: attempts.length,
          quizAttempts: quizzes.length,
          testAttempts: tests.length,
          quizAverage: avg(quizzes),
          testAverage: avg(tests),
          overallAverage: avg(attempts),
          pyqAttempted: pyqAttempts.length,
          pyqCorrect: pyqAttempts.filter((p) => p.correct).length,
          interviewsCompleted: interviews.length,
          interviewAverage: interviews.length ? Math.round(interviews.reduce((s, i) => s + (i.finalScore || 0), 0) / interviews.length) : null,
          trend,
        },
        subjectStats,
        strongTopics,
        weakTopics,
        recent,
        timeline,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPerformance };
