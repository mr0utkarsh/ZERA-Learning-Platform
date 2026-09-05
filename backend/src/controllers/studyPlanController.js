const prisma = require('../config/prisma');
const ai = require('../ai');
const progressService = require('../services/progressService');
const { badRequest, notFound, forbidden } = require('../utils/errors');
const { ok, created } = require('../utils/response');
const { clampInt } = require('../utils/validate');
const { ActivityType } = require('../utils/enums');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function getActivePlan(req, res, next) {
  try {
    const plan = await prisma.studyPlan.findFirst({
      where: { userId: req.user.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: { tasks: { orderBy: [{ date: 'asc' }, { order: 'asc' }] } },
    });
    return ok(res, { plan });
  } catch (err) {
    next(err);
  }
}

async function listPlans(req, res, next) {
  try {
    const plans = await prisma.studyPlan.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { _count: { select: { tasks: true } }, tasks: { where: { done: true }, select: { id: true } } },
    });
    return ok(res, {
      plans: plans.map((p) => ({
        id: p.id, dailyMinutes: p.dailyMinutes, targetDate: p.targetDate,
        preferredDays: JSON.parse(p.preferredDays || '[]'), status: p.status,
        createdAt: p.createdAt, taskCount: p._count.tasks, doneCount: p.tasks.length,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generate a personalized study plan.
 * Uses the student's real course state (remaining lessons, weak subjects)
 * plus their daily time, preferred days, and target date.
 */
async function generatePlan(req, res, next) {
  try {
    const { dailyMinutes, targetDate, preferredDays, courseId } = req.body || {};
    const minutes = clampInt(dailyMinutes, 15, 600, null);
    if (!minutes) throw badRequest('dailyMinutes must be between 15 and 600');
    const target = new Date(targetDate || '');
    if (Number.isNaN(target.getTime())) throw badRequest('A valid targetDate is required');
    if (target.getTime() < Date.now()) throw badRequest('Target date must be in the future');

    const days = Array.isArray(preferredDays) && preferredDays.length
      ? preferredDays.map((d) => String(d).slice(0, 3)).filter((d) => DAY_NAMES.includes(d))
      : DAY_NAMES.slice(1, 7); // default: Mon-Sat
    if (!days.length) throw badRequest('preferredDays contains no valid days');

    // ---- Build a real student summary ----
    const courses = await prisma.course.findMany({
      where: { OR: [{ userId: req.user.id }, { userId: null }] },
      select: { id: true, name: true },
    });
    const courseTrees = await Promise.all(courses.map((c) => progressService.getCourseProgress(req.user.id, c.id)));
    const subjectsSummary = [];
    for (const tree of courseTrees) {
      for (const s of tree.subjects) {
        const remainingUnits = s.units.filter((u) => u.progress < 100).map((u) => ({
          name: u.name,
          remainingChapters: u.chapters.filter((c) => c.progress < 100).map((c) => c.name),
        }));
        subjectsSummary.push({
          course: tree.courseId,
          subject: s.name,
          progress: s.progress,
          remainingLessons: s.lessonCount - s.completed,
          remainingUnits,
        });
      }
    }

    // Weak areas from real performance data
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: req.user.id, status: 'COMPLETED' },
      include: { quiz: { select: { subjectName: true } } },
    });
    const subjectScores = new Map();
    for (const a of attempts) {
      const s = a.quiz.subjectName;
      if (!s) continue;
      if (!subjectScores.has(s)) subjectScores.set(s, []);
      subjectScores.get(s).push(a.percentage || 0);
    }
    const weakAreas = [...subjectScores.entries()]
      .map(([s, arr]) => ({ subject: s, avg: arr.reduce((x, y) => x + y, 0) / arr.length }))
      .filter((x) => x.avg < 60)
      .map((x) => `${x.subject} (avg ${Math.round(x.avg)}%)`);

    // Formatted for the AI prompt
    const studentSummary = {
      subjects: subjectsSummary.map((s) => ({
        subject: s.subject, progress: s.progress, remainingLessons: s.remainingLessons,
        remainingUnits: s.remainingUnits.map((u) => `${u.name}: ${u.remainingChapters.join(', ') || 'revision only'}`),
      })),
      weakAreas,
    };
    // Raw structure for the deterministic fallback planner
    const rawSummary = { subjects: subjectsSummary };

    // ---- Plan: AI when configured, deterministic fallback otherwise ----
    let aiGenerated = true;
    let overview;
    let tasks;
    try {
      const result = await ai.generateStudyPlan({
        studentSummary,
        days,
        minutesPerDay: minutes,
        targetDate: target.toISOString().slice(0, 10),
        weakAreas,
      });
      overview = result.overview;
      tasks = result.tasks;
    } catch (err) {
      if (err.code !== 'AI_NOT_CONFIGURED') throw err;
      aiGenerated = false;
      const built = buildDeterministicPlan(rawSummary, days, minutes, target);
      overview = built.overview;
      tasks = built.tasks;
    }

    // ---- Schedule tasks onto preferred weekdays from tomorrow ----
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() + 1);
    const dayOffsetsToDate = [];
    const cursor = new Date(startDate);
    const maxDays = Math.min(Math.max(Math.ceil((target.getTime() - startDate.getTime()) / 86400000), 1), 400);
    let offset = 0;
    while (dayOffsetsToDate.length <= Math.max(...tasks.map((t) => t.dayOffset || 0), 0) && offset <= maxDays + 30) {
      if (days.includes(DAY_NAMES[cursor.getDay()])) dayOffsetsToDate.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
      offset += 1;
    }

    // Archive previous active plan
    await prisma.studyPlan.updateMany({ where: { userId: req.user.id, status: 'ACTIVE' }, data: { status: 'ABANDONED' } });

    const plan = await prisma.studyPlan.create({
      data: {
        userId: req.user.id,
        courseId: courseId || null,
        dailyMinutes: minutes,
        targetDate: target,
        preferredDays: JSON.stringify(days),
        source: aiGenerated ? 'AI' : 'MANUAL',
        tasks: {
          create: tasks.map((t, i) => ({
            title: t.title,
            detail: t.detail || null,
            date: dayOffsetsToDate[Math.min(t.dayOffset || 0, dayOffsetsToDate.length - 1)] || startDate,
            order: i,
          })),
        },
      },
      include: { tasks: { orderBy: [{ date: 'asc' }, { order: 'asc' }] } },
    });

    await prisma.activityLog.create({
      data: { userId: req.user.id, type: ActivityType.STUDY_PLAN_CREATED, message: `Created a ${aiGenerated ? 'personalized' : 'structured'} study plan (${plan.tasks.length} tasks)`, meta: JSON.stringify({ planId: plan.id }) },
    });

    return created(res, { plan, aiGenerated, overview }, aiGenerated ? 'Study plan generated' : 'Study plan created (AI not configured — generated a structured plan from your syllabus)');
  } catch (err) {
    next(err);
  }
}

/**
 * Deterministic planner used when AI is not configured. It is a real
 * scheduler (not fake AI output): distributes remaining syllabus across
 * preferred study days, prioritizing weak/behind subjects and leaving a
 * revision buffer before the target date.
 */
function buildDeterministicPlan(studentSummary, days, minutesPerDay, targetDate) {
  const items = [];
  for (const s of studentSummary.subjects) {
    for (const u of s.remainingUnits) {
      if (u.remainingChapters.length) {
        // ~1 chapter per study session, capped by daily time
        const chunks = Math.max(1, Math.ceil(u.remainingChapters.length / Math.max(1, Math.floor(minutesPerDay / 45))));
        for (let i = 0; i < chunks; i += 1) {
          const slice = u.remainingChapters.slice(i * Math.ceil(u.remainingChapters.length / chunks), (i + 1) * Math.ceil(u.remainingChapters.length / chunks));
          if (!slice.length) continue;
          items.push({ title: `Study ${s.subject} — ${u.name}: ${slice.join(', ')}`, detail: `Read, make short notes and attempt practice questions (${minutesPerDay} min budget).`, weight: 100 - s.progress });
        }
      } else {
        items.push({ title: `Revise ${s.subject} — ${u.name}`, detail: 'Quick revision pass with your notes.', weight: 50 });
      }
    }
  }
  if (!items.length) {
    items.push({ title: 'Full syllabus revision', detail: 'You have no remaining lessons — use sessions for revision and practice tests.', weight: 10 });
  }
  // Prioritize behind subjects, interleave subjects round-robin style
  items.sort((a, b) => b.weight - a.weight);

  const totalDays = Math.max(1, Math.ceil((targetDate.getTime() - Date.now()) / 86400000));
  const studyDays = Math.max(1, Math.round(totalDays * (days.length / 7)));
  const revisionDays = Math.max(1, Math.floor(studyDays * 0.15));
  const learningSlots = Math.max(1, studyDays - revisionDays);

  const tasks = [];
  items.forEach((item, i) => {
    const dayOffset = Math.min(Math.floor((i * learningSlots) / items.length), learningSlots - 1);
    tasks.push({ dayOffset, title: item.title, detail: item.detail });
  });
  for (let r = 0; r < revisionDays; r += 1) {
    tasks.push({ dayOffset: learningSlots + r, title: 'Revision & practice test day', detail: 'Revise everything covered this plan and take a quiz or mock test.' });
  }
  return {
    overview: `A structured ${studyDays}-day plan across ${days.join(', ')} (${minutesPerDay} min/day), ending with ${revisionDays} revision day(s) before your target date.`,
    tasks,
  };
}

async function toggleTask(req, res, next) {
  try {
    const task = await prisma.studyPlanTask.findUnique({ where: { id: req.params.taskId }, include: { plan: true } });
    if (!task) throw notFound('Task not found');
    if (task.plan.userId !== req.user.id) throw forbidden();
    const updated = await prisma.studyPlanTask.update({ where: { id: task.id }, data: { done: !task.done } });

    // Auto-complete the plan when every task is done
    const remaining = await prisma.studyPlanTask.count({ where: { planId: task.planId, done: false } });
    if (remaining === 0) await prisma.studyPlan.update({ where: { id: task.planId }, data: { status: 'COMPLETED' } });

    return ok(res, { task: updated, planCompleted: remaining === 0 });
  } catch (err) {
    next(err);
  }
}

async function abandonPlan(req, res, next) {
  try {
    const plan = await prisma.studyPlan.findUnique({ where: { id: req.params.id } });
    if (!plan) throw notFound('Plan not found');
    if (plan.userId !== req.user.id) throw forbidden();
    await prisma.studyPlan.update({ where: { id: plan.id }, data: { status: 'ABANDONED' } });
    return ok(res, null, 'Plan abandoned');
  } catch (err) {
    next(err);
  }
}

module.exports = { getActivePlan, listPlans, generatePlan, toggleTask, abandonPlan };
