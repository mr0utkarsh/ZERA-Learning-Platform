import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, app, prisma, signupStudent, createCourseWithLessons } from './helpers.mjs';

// AI is explicitly unconfigured in the test environment (setup.js forces
// AI_PROVIDER=none). These tests lock in the "honest unconfigured" contract:
// every AI-backed endpoint must return 503 AI_NOT_CONFIGURED and must NOT
// leave orphan rows behind (no unanswered doubt threads, no stuck interview
// sessions). Also covers the regression where course trees lost lesson titles.
describe('AI-unconfigured honesty guards', () => {
  let agent;
  let userId;
  let course;

  beforeAll(async () => {
    agent = request.agent(app);
    const { res } = await signupStudent(agent);
    userId = res.body.data.user.id;
    course = await createCourseWithLessons(userId, { subjects: 1, lessonsPerTopic: 2 });
  });
  afterAll(async () => prisma.$disconnect());

  it('course tree returns lesson titles (not just ids)', async () => {
    const res = await agent.get(`/api/courses/${course.id}`);
    expect(res.status).toBe(200);
    const lessons = res.body.data.subjects[0].units[0].chapters[0].topics[0].lessons;
    expect(lessons.length).toBeGreaterThan(0);
    for (const l of lessons) {
      expect(typeof l.title).toBe('string');
      expect(l.title.length).toBeGreaterThan(0);
    }
  });

  it('asking a doubt without AI returns 503 and creates no conversation', async () => {
    const before = await prisma.doubtConversation.count({ where: { userId } });
    const res = await agent.post('/api/doubts/ask').send({ question: 'What is velocity?' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_NOT_CONFIGURED');
    const after = await prisma.doubtConversation.count({ where: { userId } });
    expect(after).toBe(before);
  });

  it('starting an interview without AI returns 503 and creates no session', async () => {
    const before = await prisma.interviewSession.count({ where: { userId } });
    const res = await agent
      .post('/api/interviews/start')
      .send({ role: 'SDE', domain: 'Physics', difficulty: 'EASY' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_NOT_CONFIGURED');
    const after = await prisma.interviewSession.count({ where: { userId } });
    expect(after).toBe(before);
  });

  it('generating notes without AI returns 503 and stores nothing', async () => {
    const lesson = course.subjects[0].units[0].chapters[0].topics[0].lessons[0];
    const before = await prisma.note.count({ where: { userId } });
    const res = await agent
      .post('/api/notes/generate')
      .send({ targetType: 'LESSON', targetId: lesson.id });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_NOT_CONFIGURED');
    const after = await prisma.note.count({ where: { userId } });
    expect(after).toBe(before);
  });
});
