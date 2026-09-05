const prisma = require('../config/prisma');
const { badRequest, notFound, forbidden } = require('../utils/errors');
const { ok } = require('../utils/response');
const { clampInt } = require('../utils/validate');
const { Role, AccountStatus } = require('../utils/enums');

/** Admins cannot manage themselves through these endpoints. */
function assertNotSelf(adminId, userId) {
  if (adminId === userId) throw forbidden('You cannot perform this action on your own account');
}

async function getStats(req, res, next) {
  try {
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const [students, suspended, activeToday, courses, quizAttempts, testAttempts, notes, interviews, recentSignups] = await Promise.all([
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.user.count({ where: { role: Role.STUDENT, status: AccountStatus.SUSPENDED } }),
      prisma.activityLog.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.course.count(),
      prisma.quizAttempt.count({ where: { quiz: { type: 'QUIZ' }, status: 'COMPLETED' } }),
      prisma.quizAttempt.count({ where: { quiz: { type: 'MOCK_TEST' }, status: 'COMPLETED' } }),
      prisma.note.count(),
      prisma.interviewSession.count({ where: { status: 'COMPLETED' } }),
      prisma.user.findMany({ where: { role: Role.STUDENT }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, email: true, createdAt: true } }),
    ]);
    return ok(res, {
      stats: {
        totalStudents: students,
        activeStudents: students - suspended,
        suspendedStudents: suspended,
        activeLast24h: activeToday,
        totalCourses: courses,
        quizAttempts,
        testAttempts,
        notesGenerated: notes,
        interviewsCompleted: interviews,
        recentSignups,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listStudents(req, res, next) {
  try {
    const page = clampInt(req.query.page, 1, 10000, 1);
    const pageSize = clampInt(req.query.limit, 1, 100, 20);
    const where = { role: Role.STUDENT };
    if (req.query.q) {
      const q = String(req.query.q);
      where.OR = [{ name: { contains: q } }, { email: { contains: q } }];
    }
    if (req.query.status === 'ACTIVE') where.status = AccountStatus.ACTIVE;
    if (req.query.status === 'SUSPENDED') where.status = AccountStatus.SUSPENDED;

    const [total, students] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, name: true, email: true, status: true, emailVerified: true,
          createdAt: true, institution: true,
          _count: { select: { courses: true, quizAttempts: true } },
        },
      }),
    ]);
    return ok(res, { total, page, pageSize, students });
  } catch (err) {
    next(err);
  }
}

async function getStudent(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true, status: true, emailVerified: true,
        createdAt: true, institution: true, gradeLevel: true, bio: true,
      },
    });
    if (!user) throw notFound('Student not found');
    if (user.role !== Role.STUDENT) throw badRequest('That account is not a student');

    const [courses, attempts, completions, sessions, plans] = await Promise.all([
      prisma.course.findMany({ where: { userId: user.id }, select: { id: true, name: true, source: true, createdAt: true } }),
      prisma.quizAttempt.findMany({ where: { userId: user.id, status: 'COMPLETED' }, select: { percentage: true, submittedAt: true, quiz: { select: { type: true, title: true } } }, orderBy: { submittedAt: 'desc' }, take: 20 }),
      prisma.lessonCompletion.count({ where: { userId: user.id } }),
      prisma.studySession.aggregate({ where: { userId: user.id }, _sum: { minutes: true } }),
      prisma.studyPlan.count({ where: { userId: user.id } }),
    ]);
    return ok(res, {
      student: user,
      activity: {
        courses,
        completedLessons: completions,
        studyMinutes: sessions._sum.minutes || 0,
        attempts,
        studyPlans: plans,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function suspendStudent(req, res, next) {
  try {
    assertNotSelf(req.user.id, req.params.id);
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound('Student not found');
    if (user.role !== Role.STUDENT) throw badRequest('Only student accounts can be suspended');
    await prisma.user.update({ where: { id: user.id }, data: { status: AccountStatus.SUSPENDED } });
    return ok(res, null, 'Student suspended');
  } catch (err) {
    next(err);
  }
}

async function restoreStudent(req, res, next) {
  try {
    assertNotSelf(req.user.id, req.params.id);
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound('Student not found');
    await prisma.user.update({ where: { id: user.id }, data: { status: AccountStatus.ACTIVE } });
    return ok(res, null, 'Student restored');
  } catch (err) {
    next(err);
  }
}

async function deleteStudent(req, res, next) {
  try {
    assertNotSelf(req.user.id, req.params.id);
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound('Student not found');
    if (user.role !== Role.STUDENT) throw badRequest('Only student accounts can be removed');
    await prisma.user.delete({ where: { id: user.id } });
    return ok(res, null, 'Student account removed');
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats, listStudents, getStudent, suspendStudent, restoreStudent, deleteStudent };
