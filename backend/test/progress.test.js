import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres, resetDatabase } from './helpers/postgres.js';

let pg;
let prisma;

const seedCourseWithLessons = async (lessonCount) => {
  const course = await prisma.course.create({
    data: { title: 'Test Course', slug: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`, isPublished: true }
  });
  const subject = await prisma.subject.create({ data: { title: 'Subject', courseId: course.id, sequence: 0 } });
  const unit = await prisma.unit.create({ data: { title: 'Unit', subjectId: subject.id, sequence: 0 } });
  const chapter = await prisma.chapter.create({ data: { title: 'Chapter', unitId: unit.id, sequence: 0 } });
  const topic = await prisma.topic.create({ data: { title: 'Topic', chapterId: chapter.id, sequence: 0 } });

  const lessons = [];
  for (let i = 0; i < lessonCount; i += 1) {
    lessons.push(
      await prisma.lesson.create({ data: { title: `Lesson ${i + 1}`, sequence: i + 1, topicId: topic.id } })
    );
  }
  return { course, lessons };
};

before(async () => {
  pg = await startPostgres();
  // The services under test use the shared Prisma singleton from
  // src/config/prisma.js, whose client is built from DATABASE_URL at module
  // load time. Pointing that at the harness keeps these tests off the real
  // Supabase instance, and re-using that one client avoids opening a second
  // pooled connection to the single-connection socket server.
  process.env.DATABASE_URL = pg.url;
  process.env.DIRECT_URL = pg.url;
  ({ prisma } = await import('../src/config/prisma.js'));
});

after(async () => {
  await prisma.$disconnect();
  await pg.stop();
});

describe('course progress is derived from real lesson completions', () => {
  it('does not mark skipped lessons complete when a later lesson is finished', async () => {
    await resetDatabase(prisma);
    const user = await prisma.user.create({
      data: { name: 'Student', email: `s${Date.now()}@t.dev`, passwordHash: 'x' }
    });
    const { course, lessons } = await seedCourseWithLessons(10);

    const { markLessonCompleted } = await import('../src/services/courseService.js');

    // Jump straight to lesson 9. The old high-water-mark logic reported 90%.
    const result = await markLessonCompleted(user.id, course.id, lessons[8].id);

    assert.equal(result.progress.completedLessons, 1, 'only the one finished lesson counts');
    assert.equal(result.progress.completionPercentage, 10);
    assert.deepEqual(result.completedLessonIds, [lessons[8].id]);
    assert.equal(result.nextLesson.id, lessons[0].id, 'next lesson is the first unfinished one');
  });

  it('is idempotent when the same lesson is completed twice', async () => {
    await resetDatabase(prisma);
    const user = await prisma.user.create({
      data: { name: 'Student', email: `s${Date.now()}@t.dev`, passwordHash: 'x' }
    });
    const { course, lessons } = await seedCourseWithLessons(5);
    const { markLessonCompleted } = await import('../src/services/courseService.js');

    await markLessonCompleted(user.id, course.id, lessons[0].id);
    const second = await markLessonCompleted(user.id, course.id, lessons[0].id);

    assert.equal(second.progress.completedLessons, 1);
    const rows = await prisma.lessonCompletion.count({ where: { userId: user.id } });
    assert.equal(rows, 1, 'no duplicate completion rows');
  });

  it('reports full completion only when every lesson is done', async () => {
    await resetDatabase(prisma);
    const user = await prisma.user.create({
      data: { name: 'Student', email: `s${Date.now()}@t.dev`, passwordHash: 'x' }
    });
    const { course, lessons } = await seedCourseWithLessons(3);
    const { markLessonCompleted, getCourseProgressSnapshot } = await import('../src/services/courseService.js');

    for (const lesson of lessons.slice(0, 2)) {
      await markLessonCompleted(user.id, course.id, lesson.id);
    }
    const midway = await getCourseProgressSnapshot(user.id, course.id);
    assert.equal(midway.progress.status, 'IN_PROGRESS');
    assert.equal(midway.progress.completionPercentage, 67);

    await markLessonCompleted(user.id, course.id, lessons[2].id);
    const done = await getCourseProgressSnapshot(user.id, course.id);
    assert.equal(done.progress.status, 'COMPLETED');
    assert.equal(done.progress.completionPercentage, 100);
  });

  it('rejects a lesson that belongs to another course', async () => {
    await resetDatabase(prisma);
    const user = await prisma.user.create({
      data: { name: 'Student', email: `s${Date.now()}@t.dev`, passwordHash: 'x' }
    });
    const a = await seedCourseWithLessons(2);
    const b = await seedCourseWithLessons(2);
    const { markLessonCompleted } = await import('../src/services/courseService.js');

    await assert.rejects(
      () => markLessonCompleted(user.id, a.course.id, b.lessons[0].id),
      /Lesson not found for this course/
    );
  });

  it('records an activity log entry per completion', async () => {
    await resetDatabase(prisma);
    const user = await prisma.user.create({
      data: { name: 'Student', email: `s${Date.now()}@t.dev`, passwordHash: 'x' }
    });
    const { course, lessons } = await seedCourseWithLessons(2);
    const { markLessonCompleted } = await import('../src/services/courseService.js');

    await markLessonCompleted(user.id, course.id, lessons[0].id);
    const logs = await prisma.activityLog.findMany({ where: { userId: user.id } });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].type, 'LESSON_COMPLETED');
  });
});
