const prisma = require('../config/prisma');
const progressService = require('../services/progressService');
const { ok } = require('../utils/response');
const { safeJsonParse } = require('../utils/validate');

const dayKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

async function computeStreak(userId) {
  const [completions, attempts, sessions] = await Promise.all([
    prisma.lessonCompletion.findMany({ where: { userId }, select: { completedAt: true } }),
    prisma.quizAttempt.findMany({ where: { userId, submittedAt: { not: null } }, select: { submittedAt: true } }),
    prisma.studySession.findMany({ where: { userId }, select: { date: true } }),
  ]);
  const days = new Set([
    ...completions.map((c) => dayKey(c.completedAt)),
    ...attempts.map((a) => dayKey(a.submittedAt)),
    ...sessions.map((s) => dayKey(s.date)),
  ]);
  if (!days.size) return 0;

  let streak = 0;
  const cursor = new Date();
  // Streak may start today or yesterday (today might just be getting started)
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function getProgress(req, res, next) {
  try {
    const userId = req.user.id;
    const courses = await prisma.course.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      select: { id: true, name: true },
    });
    const courseProgress = await Promise.all(
      courses.map(async (c) => ({ name: c.name, id: c.id, ...(await progressService.getCourseProgress(userId, c.id)) }))
    );
    const totalLessons = courseProgress.reduce((a, c) => a + c.totalLessons, 0);
    const completedLessons = courseProgress.reduce((a, c) => a + c.completedLessons, 0);

    const sessions = await prisma.studySession.findMany({ where: { userId }, select: { minutes: true } });
    const studyMinutes = sessions.reduce((a, s) => a + s.minutes, 0);
    const streak = await computeStreak(userId);

    return ok(res, {
      overall: {
        progress: progressService.pct(completedLessons, totalLessons),
        totalLessons,
        completedLessons,
        studyMinutes,
        streak,
      },
      courses: courseProgress,
    });
  } catch (err) {
    next(err);
  }
}

async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;

    const [courses, streak, recentActivities, quizAttempts, testAttempts, studySessions, activePlan] = await Promise.all([
      prisma.course.findMany({
        where: { OR: [{ userId }, { userId: null }] },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, description: true, source: true },
      }),
      computeStreak(userId),
      prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.quizAttempt.findMany({ where: { userId, status: 'COMPLETED', quiz: { type: 'QUIZ' } }, orderBy: { submittedAt: 'desc' }, take: 5, include: { quiz: { select: { title: true } } } }),
      prisma.quizAttempt.findMany({ where: { userId, status: 'COMPLETED', quiz: { type: 'MOCK_TEST' } }, orderBy: { submittedAt: 'desc' }, take: 5, include: { quiz: { select: { title: true } } } }),
      prisma.studySession.findMany({ where: { userId }, select: { minutes: true } }),
      prisma.studyPlan.findFirst({ where: { userId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' }, include: { tasks: { where: { done: false }, orderBy: { date: 'asc' }, take: 5 } } }),
    ]);

    const courseProgress = await Promise.all(courses.map(async (c) => {
      const p = await progressService.getCourseProgress(userId, c.id);
      const next = await progressService.getNextLesson(userId, c.id);
      return { ...c, progress: p.progress, totalLessons: p.totalLessons, completedLessons: p.completedLessons, nextLesson: next, subjects: p.subjects.map((s) => ({ id: s.id, name: s.name, progress: s.progress, lessonCount: s.lessonCount })) };
    }));

    const totalLessons = courseProgress.reduce((a, c) => a + c.totalLessons, 0);
    const completedLessons = courseProgress.reduce((a, c) => a + c.completedLessons, 0);
    const studyMinutes = studySessions.reduce((a, s) => a + s.minutes, 0);

    // Continue learning: first course with an incomplete lesson
    const continueLearning = courseProgress.find((c) => c.nextLesson) || null;

    const quizAvg = quizAttempts.length
      ? Math.round(quizAttempts.reduce((a, q) => a + (q.percentage || 0), 0) / quizAttempts.length)
      : null;
    const testAvg = testAttempts.length
      ? Math.round(testAttempts.reduce((a, q) => a + (q.percentage || 0), 0) / testAttempts.length)
      : null;

    // Recommendations derived from real state (no filler content)
    const recommendations = [];
    if (!totalLessons) {
      recommendations.push({ type: 'SETUP', title: 'Set up your syllabus', detail: 'Upload your syllabus or create a course so ZERA can structure your learning.' });
    } else {
      const behind = courseProgress.filter((c) => c.totalLessons > 0 && c.progress < 100).sort((a, b) => a.progress - b.progress)[0];
      if (behind) recommendations.push({ type: 'STUDY', title: `Continue ${behind.name}`, detail: `You have completed ${behind.completedLessons} of ${behind.totalLessons} lessons (${behind.progress}%).` });
      if (quizAttempts.length === 0) recommendations.push({ type: 'QUIZ', title: 'Take your first quiz', detail: 'Test what you have learned — quizzes sharpen recall and feed your performance analysis.' });
      if (!activePlan) recommendations.push({ type: 'PLAN', title: 'Create a study plan', detail: 'Tell ZERA your daily study time and target date to get a personalized schedule.' });
    }

    return ok(res, {
      dashboard: {
        welcome: { name: req.user.name },
        streak,
        studyMinutes,
        overallProgress: progressService.pct(completedLessons, totalLessons),
        totalLessons,
        completedLessons,
        courses: courseProgress,
        continueLearning,
        recentActivity: recentActivities.map((a) => ({ id: a.id, type: a.type, message: a.message, createdAt: a.createdAt })),
        quizPerformance: {
          attempts: quizAttempts.map((a) => ({ id: a.id, title: a.quiz.title, percentage: a.percentage, submittedAt: a.submittedAt })),
          average: quizAvg,
        },
        testPerformance: {
          attempts: testAttempts.map((a) => ({ id: a.id, title: a.quiz.title, percentage: a.percentage, submittedAt: a.submittedAt })),
          average: testAvg,
        },
        upcomingTasks: activePlan ? activePlan.tasks.map((t) => ({ id: t.id, title: t.title, date: t.date })) : [],
        recommendations,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProgress, getDashboard, computeStreak };
