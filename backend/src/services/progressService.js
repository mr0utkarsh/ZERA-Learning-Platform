/**
 * Progress calculation — always derived from real LessonCompletion rows.
 * No random/fake values, ever.
 */
const prisma = require('../config/prisma');

const pct = (done, total) => (total === 0 ? 0 : Math.round((done / total) * 100));

async function getCourseProgress(userId, courseId) {
  const subjects = await prisma.subject.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    include: {
      units: {
        orderBy: { order: 'asc' },
        include: {
          chapters: {
            orderBy: { order: 'asc' },
            include: {
              topics: {
                orderBy: { order: 'asc' },
                include: { lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true } } },
              },
            },
          },
        },
      },
    },
  });

  const completions = await prisma.lessonCompletion.findMany({
    where: { userId, lesson: { topic: { chapter: { unit: { subject: { courseId } } } } } },
    select: { lessonId: true },
  });
  const done = new Set(completions.map((c) => c.lessonId));

  let courseTotal = 0;
  let courseDone = 0;

  const result = subjects.map((s) => {
    let subTotal = 0;
    let subDone = 0;
    const units = s.units.map((u) => {
      let uTotal = 0;
      let uDone = 0;
      const chapters = u.chapters.map((c) => {
        let cTotal = 0;
        let cDone = 0;
        const topics = c.topics.map((t) => {
          const tTotal = t.lessons.length;
          const tDone = t.lessons.filter((l) => done.has(l.id)).length;
          cTotal += tTotal;
          cDone += tDone;
          return {
            id: t.id, name: t.name, important: t.important,
            lessonCount: tTotal, completed: tDone, progress: pct(tDone, tTotal),
            lessons: t.lessons.map((l) => ({ id: l.id, title: l.title, completed: done.has(l.id) })),
          };
        });
        uTotal += cTotal;
        uDone += cDone;
        return { id: c.id, name: c.name, lessonCount: cTotal, completed: cDone, progress: pct(cDone, cTotal), topics };
      });
      subTotal += uTotal;
      subDone += uDone;
      return { id: u.id, name: u.name, lessonCount: uTotal, completed: uDone, progress: pct(uDone, uTotal), chapters };
    });
    courseTotal += subTotal;
    courseDone += subDone;
    return { id: s.id, name: s.name, code: s.code, lessonCount: subTotal, completed: subDone, progress: pct(subDone, subTotal), units };
  });

  return { courseId, progress: pct(courseDone, courseTotal), totalLessons: courseTotal, completedLessons: courseDone, subjects: result };
}

async function getLessonDetail(userId, lessonId) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      topic: {
        include: {
          chapter: { include: { unit: { include: { subject: { include: { course: true } } } } } },
          lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true } },
        },
      },
    },
  });
  if (!lesson) return null;
  const completion = await prisma.lessonCompletion.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
  return { lesson, completion };
}

/** Next incomplete lesson in a course — used for "Continue learning". */
async function getNextLesson(userId, courseId) {
  const lessons = await prisma.lesson.findMany({
    where: { topic: { chapter: { unit: { subject: { courseId } } } } },
    orderBy: [{ topic: { chapter: { unit: { subject: { order: 'asc' } } } } },
      { topic: { chapter: { unit: { order: 'asc' } } } },
      { topic: { chapter: { order: 'asc' } } },
      { topic: { order: 'asc' } },
      { order: 'asc' }],
    select: { id: true, title: true, topic: { select: { name: true, chapter: { select: { name: true, unit: { select: { name: true, subject: { select: { name: true } } } } } } } } },
  });
  if (!lessons.length) return null;
  const completed = new Set(
    (await prisma.lessonCompletion.findMany({ where: { userId, lessonId: { in: lessons.map((l) => l.id) } }, select: { lessonId: true } }))
      .map((c) => c.lessonId));
  const next = lessons.find((l) => !completed.has(l.id));
  return next || null;
}

module.exports = { pct, getCourseProgress, getLessonDetail, getNextLesson };
