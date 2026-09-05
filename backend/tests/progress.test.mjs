import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, app, prisma, signupStudent, createCourseWithLessons } from './helpers.mjs';


describe('Progress calculation (real data only)', () => {
  let agent;
  let userId;

  beforeAll(async () => {
    await prisma.lessonCompletion.deleteMany({});
    await prisma.course.deleteMany({});
    await prisma.user.deleteMany({});

    agent = request.agent(app);
    const { res } = await signupStudent(agent);
    userId = res.body.data.user.id;
  });
  afterAll(async () => prisma.$disconnect());

  it('a new student starts at exactly 0% overall progress', async () => {
    const res = await agent.get('/api/progress');
    expect(res.status).toBe(200);
    expect(res.body.data.overall.progress).toBe(0);
    expect(res.body.data.overall.completedLessons).toBe(0);
    expect(res.body.data.overall.streak).toBe(0);
  });

  it('a new course starts at 0%', async () => {
    const course = await createCourseWithLessons(userId, { subjects: 1, lessonsPerTopic: 4 });
    const res = await agent.get(`/api/courses/${course.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.progress).toBe(0);
    expect(res.body.data.totalLessons).toBe(4);
  });

  it('completing lessons updates progress proportionally', async () => {
    const course = await createCourseWithLessons(userId, { subjects: 1, lessonsPerTopic: 4 });
    const lessons = course.subjects[0].units[0].chapters[0].topics[0].lessons;

    await agent.post(`/api/courses/lessons/${lessons[0].id}/complete`);
    let res = await agent.get(`/api/courses/${course.id}`);
    expect(res.body.data.progress).toBe(25); // 1 of 4

    await agent.post(`/api/courses/lessons/${lessons[1].id}/complete`);
    res = await agent.get(`/api/courses/${course.id}`);
    expect(res.body.data.progress).toBe(50); // 2 of 4

    const overall = await agent.get('/api/progress');
    expect(overall.body.data.overall.completedLessons).toBe(2);
  });

  it('completing a lesson twice does not double-count', async () => {
    const course = await createCourseWithLessons(userId, { subjects: 1, lessonsPerTopic: 2 });
    const lesson = course.subjects[0].units[0].chapters[0].topics[0].lessons[0];
    await agent.post(`/api/courses/lessons/${lesson.id}/complete`);
    await agent.post(`/api/courses/lessons/${lesson.id}/complete`); // idempotent upsert
    const res = await agent.get(`/api/courses/${course.id}`);
    expect(res.body.data.completedLessons).toBe(1);
    expect(res.body.data.progress).toBe(50);
  });

  it('unmarking a lesson reduces progress again', async () => {
    const course = await createCourseWithLessons(userId, { subjects: 1, lessonsPerTopic: 2 });
    const lesson = course.subjects[0].units[0].chapters[0].topics[0].lessons[0];
    await agent.post(`/api/courses/lessons/${lesson.id}/complete`);
    await agent.delete(`/api/courses/lessons/${lesson.id}/complete`);
    const res = await agent.get(`/api/courses/${course.id}`);
    expect(res.body.data.completedLessons).toBe(0);
    expect(res.body.data.progress).toBe(0);
  });

  it('a student cannot complete lessons in another student\'s private course', async () => {
    // create another student's private course directly
    const other = await prisma.user.create({
      data: { name: 'Other', email: `other${Date.now()}@t.co`, passwordHash: 'x' },
    });
    const otherCourse = await createCourseWithLessons(other.id, { lessonsPerTopic: 1 });
    const lesson = otherCourse.subjects[0].units[0].chapters[0].topics[0].lessons[0];
    const res = await agent.post(`/api/courses/lessons/${lesson.id}/complete`);
    expect(res.status).toBe(403);
  });
});
