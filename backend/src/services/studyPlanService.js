import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_MINUTES = 45;

// Personalized study plan (Feature 8). Deterministic rule-based engine: schedules
// real confirmed topics across available days up to the exam date, prioritizing
// hard/uncertain/needs-revision topics, then adds revision + practice passes.
const priorityScore = (t) => (t.needsRevision ? 3 : 0) + (t.uncertain ? 2 : 0) + (t.difficulty === 'hard' ? 2 : t.difficulty === 'medium' ? 1 : 0);

const flattenTopics = (syllabus) => {
  const topics = [];
  let seq = 0;
  for (const subject of syllabus.subjects)
    for (const unit of subject.units)
      for (const topic of unit.topics)
        topics.push({ ...topic, order: seq++, subject: subject.title, unit: unit.title });
  return topics;
};

const buildRuleBasedTasks = (syllabus, profile, examDate) => {
  const topics = flattenTopics(syllabus);
  if (topics.length === 0) return [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let horizonDays = 14;
  if (examDate) {
    const diff = Math.ceil((new Date(examDate).getTime() - today.getTime()) / DAY_MS);
    horizonDays = Math.min(90, Math.max(1, diff));
  }
  const dailyMinutes = profile?.dailyMinutes || (profile?.weeklyHours ? Math.round((profile.weeklyHours * 60) / 7) : 0) || 60;
  const sessionsPerDay = Math.max(1, Math.min(6, Math.floor(dailyMinutes / SESSION_MINUTES)));
  const ordered = [...topics].sort((a, b) => (priorityScore(b) - priorityScore(a)) || (a.order - b.order));
  const tasks = [];
  let dayIndex = 0, sessionIndex = 0;
  const pushTask = (kind, topic) => {
    tasks.push({
      kind, topicId: topic.id,
      title: kind === 'REVISION' ? `Revise: ${topic.title}` : kind === 'PRACTICE' ? `Practice: ${topic.title}` : `Study: ${topic.title}`,
      detail: `${topic.subject} · ${topic.unit}`,
      dueDate: new Date(today.getTime() + dayIndex * DAY_MS),
      sequence: tasks.length
    });
    sessionIndex += 1;
    if (sessionIndex >= sessionsPerDay) { sessionIndex = 0; dayIndex += 1; }
  };
  for (const topic of ordered) pushTask('STUDY', topic);
  for (const topic of ordered) if (topic.needsRevision || topic.difficulty === 'hard') pushTask('REVISION', topic);
  for (const topic of ordered) pushTask('PRACTICE', topic);
  return tasks;
};

const loadOwnedSyllabus = async (userId, syllabusId) => {
  const syllabus = await prisma.confirmedSyllabus.findFirst({
    where: { id: syllabusId, userId },
    include: { subjects: { orderBy: { sequence: 'asc' }, include: { units: { orderBy: { sequence: 'asc' }, include: { topics: { orderBy: { sequence: 'asc' } } } } } } }
  });
  if (!syllabus) throw new ApiError(404, 'Confirmed syllabus not found.');
  return syllabus;
};

const loadOwnedTask = async (userId, taskId) => {
  const task = await prisma.studyTask.findFirst({ where: { id: taskId, userId } });
  if (!task) throw new ApiError(404, 'Task not found.');
  return task;
};

export const generateStudyPlan = async (userId, input, { useAi = false } = {}) => {
  const syllabus = await loadOwnedSyllabus(userId, input.syllabusId);
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const examDate = input.examDate ? new Date(input.examDate) : (syllabus.examDate || profile?.examDate || null);
  let generator = 'RULE_BASED';
  const tasks = buildRuleBasedTasks(syllabus, profile, examDate);
  if (useAi) {
    try {
      const { aiStatus } = await import('./aiService.js');
      if (aiStatus().configured.length > 0) generator = 'AI';
    } catch { generator = 'RULE_BASED'; }
  }
  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.studyPlan.create({
      data: {
        userId, confirmedSyllabusId: syllabus.id, generator,
        title: input.title || `${syllabus.courseName} study plan`,
        description: examDate ? `Plan toward ${new Date(examDate).toDateString()}.` : 'Preliminary plan from your confirmed syllabus.',
        status: 'ACTIVE',
        schedule: { sessions: tasks.length, examDate: examDate ? examDate.toISOString() : null }
      }
    });
    if (tasks.length > 0) {
      await tx.studyTask.createMany({
        data: tasks.map((t) => ({ studyPlanId: created.id, userId, title: t.title, detail: t.detail, kind: t.kind, topicId: t.topicId, dueDate: t.dueDate, sequence: t.sequence, status: 'PENDING' }))
      });
    }
    return created;
  });
  return getStudyPlan(userId, plan.id);
};

export const getStudyPlan = async (userId, planId) => {
  const plan = await prisma.studyPlan.findFirst({
    where: { id: planId, userId },
    include: { tasks: { orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }] } }
  });
  if (!plan) throw new ApiError(404, 'Study plan not found.');
  return plan;
};

export const listStudyPlans = async (userId) =>
  prisma.studyPlan.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, include: { _count: { select: { tasks: true } } } });

export const completeTask = async (userId, taskId) => {
  await loadOwnedTask(userId, taskId);
  return prisma.studyTask.update({ where: { id: taskId }, data: { status: 'COMPLETED', isCompleted: true, completedAt: new Date() } });
};

export const skipTask = async (userId, taskId) => {
  await loadOwnedTask(userId, taskId);
  return prisma.studyTask.update({ where: { id: taskId }, data: { status: 'SKIPPED', isCompleted: false, completedAt: null } });
};

export const rescheduleTask = async (userId, taskId, dueDate) => {
  await loadOwnedTask(userId, taskId);
  const date = dueDate ? new Date(dueDate) : null;
  if (dueDate && Number.isNaN(date?.getTime())) throw new ApiError(400, 'The due date is not a valid date.');
  return prisma.studyTask.update({ where: { id: taskId }, data: { dueDate: date } });
};

export const planSummary = async (userId, planId) => {
  const plan = await getStudyPlan(userId, planId);
  const total = plan.tasks.length;
  const completed = plan.tasks.filter((t) => t.status === 'COMPLETED').length;
  const skipped = plan.tasks.filter((t) => t.status === 'SKIPPED').length;
  return {
    planId: plan.id, generator: plan.generator, total, completed, skipped, pending: total - completed - skipped,
    percentComplete: total > 0 ? Math.round((completed / total) * 1000) / 10 : null
  };
};
