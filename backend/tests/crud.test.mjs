import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, app, prisma, signupStudent, createCourseWithLessons } from './helpers.mjs';

describe('Hierarchy CRUD (real database operations)', () => {
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

  it('updates a course (rename + description)', async () => {
    const res = await agent.patch(`/api/courses/${course.id}`).send({ name: 'Renamed Course', description: 'updated' });
    expect(res.status).toBe(200);
    const db = await prisma.course.findUnique({ where: { id: course.id } });
    expect(db.name).toBe('Renamed Course');
    expect(db.description).toBe('updated');
  });

  it('updates and deletes subjects', async () => {
    const subjectId = course.subjects[0].id;
    let res = await agent.patch(`/api/courses/subjects/${subjectId}`).send({ name: 'Renamed Subject', code: 'X1' });
    expect(res.status).toBe(200);
    expect(res.body.data.subject.name).toBe('Renamed Subject');

    const s2 = await prisma.subject.create({ data: { name: 'Doomed', courseId: course.id, order: 9 } });
    res = await agent.delete(`/api/courses/subjects/${s2.id}`);
    expect(res.status).toBe(200);
    expect(await prisma.subject.findUnique({ where: { id: s2.id } })).toBeNull();
  });

  it('updates and deletes units / chapters / topics', async () => {
    const unit = course.subjects[0].units[0];
    const chapter = unit.chapters[0];
    const topic = chapter.topics[0];

    expect((await agent.patch(`/api/courses/units/${unit.id}`).send({ name: 'U-renamed' })).status).toBe(200);
    expect((await agent.patch(`/api/courses/chapters/${chapter.id}`).send({ name: 'C-renamed' })).status).toBe(200);
    expect((await agent.patch(`/api/courses/topics/${topic.id}`).send({ name: 'T-renamed', important: true })).status).toBe(200);
    const t = await prisma.topic.findUnique({ where: { id: topic.id } });
    expect(t.name).toBe('T-renamed');
    expect(t.important).toBe(true);

    // delete a fresh topic
    const t2 = await prisma.topic.create({ data: { name: 'Doomed topic', chapterId: chapter.id, order: 9 } });
    expect((await agent.delete(`/api/courses/topics/${t2.id}`)).status).toBe(200);
    expect(await prisma.topic.findUnique({ where: { id: t2.id } })).toBeNull();
  });

  it('updates lessons and deletes them (cascading completions removed)', async () => {
    const lesson = course.subjects[0].units[0].chapters[0].topics[0].lessons[0];

    // complete it, then delete -> completion rows must cascade away
    await agent.post(`/api/courses/lessons/${lesson.id}/complete`);
    expect(await prisma.lessonCompletion.count({ where: { lessonId: lesson.id } })).toBe(1);

    let res = await agent.patch(`/api/courses/lessons/${lesson.id}`).send({
      title: 'Updated lesson', content: 'New content', objectives: ['o1', 'o2'],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.lesson.title).toBe('Updated lesson');

    res = await agent.delete(`/api/courses/lessons/${lesson.id}`);
    expect(res.status).toBe(200);
    expect(await prisma.lesson.findUnique({ where: { id: lesson.id } })).toBeNull();
    expect(await prisma.lessonCompletion.count({ where: { lessonId: lesson.id } })).toBe(0);
  });

  it('validation rejects empty/oversized names', async () => {
    const subjectId = course.subjects[0].id;
    expect((await agent.patch(`/api/courses/subjects/${subjectId}`).send({ name: '   ' })).status).toBe(400);
    expect((await agent.patch(`/api/courses/subjects/${subjectId}`).send({ name: 'x'.repeat(301) })).status).toBe(400);
  });

  it('enforces ownership on update/delete', async () => {
    const intruder = request.agent(app);
    await signupStudent(intruder);
    const subjectId = course.subjects[0].id;
    expect((await intruder.patch(`/api/courses/subjects/${subjectId}`).send({ name: 'hax' })).status).toBe(403);
    expect((await intruder.delete(`/api/courses/subjects/${subjectId}`)).status).toBe(403);
    expect((await intruder.patch(`/api/courses/${course.id}`).send({ name: 'hax' })).status).toBe(403);
    expect((await intruder.delete(`/api/courses/${course.id}`)).status).toBe(403);
  });

  it('deleting a course cascades the whole tree', async () => {
    const res = await agent.delete(`/api/courses/${course.id}`);
    expect(res.status).toBe(200);
    expect(await prisma.subject.count({ where: { courseId: course.id } })).toBe(0);
    expect(await prisma.lesson.count({ where: { topic: { chapter: { unit: { subject: { courseId: course.id } } } } } })).toBe(0);
  });
});

describe('OTP expiry and quiz resubmission guards', () => {
  let agent;
  let email;

  beforeAll(async () => {
    agent = request.agent(app);
    const { res, payload } = await signupStudent(agent);
    email = payload.email;
    void res;
  });
  afterAll(async () => prisma.$disconnect());

  it('expired OTP is rejected even with the correct code', async () => {
    const otp = await prisma.otp.findFirst({ where: { purpose: 'EMAIL_VERIFICATION', used: false }, orderBy: { createdAt: 'desc' } });
    // force-expire it in the database
    await prisma.otp.update({ where: { id: otp.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await agent.post('/api/auth/verify-email').send({ code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('a consumed reset OTP cannot be used twice', async () => {
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    const code = forgot.body.data.devOtp;
    const first = await request(app).post('/api/auth/reset-password').send({ email, code, password: 'NewPass789', confirmPassword: 'NewPass789' });
    expect(first.status).toBe(200);
    const replay = await request(app).post('/api/auth/reset-password').send({ email, code, password: 'Another123', confirmPassword: 'Another123' });
    expect(replay.status).toBe(400);
  });

  it('submitting an already-completed quiz attempt is idempotent', async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    const quiz = await prisma.quiz.create({
      data: {
        userId: user.id, title: 'Idempotency quiz', type: 'QUIZ', subjectName: 'X', difficulty: 'MEDIUM',
        questions: JSON.stringify([{ type: 'MCQ', text: 'q', choices: ['a', 'b'], correctIndex: 0 }]),
      },
    });
    const start = await agent.post(`/api/quizzes/${quiz.id}/attempts`);
    const attemptId = start.body.data.attempt.id;
    const first = await agent.post(`/api/quizzes/attempts/${attemptId}/submit`).send({ answers: [0] });
    expect(first.status).toBe(200);
    const second = await agent.post(`/api/quizzes/attempts/${attemptId}/submit`).send({ answers: [1] });
    expect(second.status).toBe(200);
    // second submission must not re-grade with different answers
    expect(second.body.data.attempt.score).toBe(first.body.data.attempt.score);
    expect(second.body.data.attempt.answers).toEqual(first.body.data.attempt.answers);
  });
});
