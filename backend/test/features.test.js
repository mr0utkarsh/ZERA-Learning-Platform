import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres, resetDatabase } from './helpers/postgres.js';

// All tests in ONE describe. Separate top-level describes overlapped in time
// and resetDatabase in one truncated another test's rows mid-flight
// (QuizAttempt_userId FK violation + cancelled timeouts), so they run here in
// a single sequential block on purpose.
let pg;
let prisma;

const makeUser = async () =>
  prisma.user.create({
    data: { name: 'Student', email: `s${Date.now()}-${Math.random().toString(36).slice(2)}@t.dev`, passwordHash: 'x' }
  });

const sampleQuiz = () => ({
  title: 'OS Basics',
  difficulty: 'easy',
  questions: [
    { prompt: 'What is a process?', options: ['A program in execution', 'A file', 'A thread', 'A kernel'], correctAnswer: 'A program in execution', explanation: 'A process is a program in execution.' },
    { prompt: 'RAM stands for?', options: ['Random Access Memory', 'Read Access Memory', 'Run Access Memory', 'Rapid Access Memory'], correctAnswer: 'Random Access Memory' }
  ]
});

before(async () => {
  pg = await startPostgres();
  process.env.DATABASE_URL = pg.url;
  process.env.DIRECT_URL = pg.url;
  ({ prisma } = await import('../src/config/prisma.js'));
});
after(async () => { await prisma.$disconnect(); await pg.stop(); });

describe('feature workflows', () => {
  it('rejects a question whose answer is not among its options', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { createQuiz } = await import('../src/services/quizService.js');
    await assert.rejects(
      () => createQuiz(user.id, { questions: [{ prompt: 'Q?', options: ['A', 'B'], correctAnswer: 'Z' }] }),
      /not among its options/
    );
  });

  it('never leaks answer keys when loading a quiz to attempt', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { createQuiz, getQuizForAttempt } = await import('../src/services/quizService.js');
    const created = await createQuiz(user.id, sampleQuiz());
    const forAttempt = await getQuizForAttempt(user.id, created.id);
    assert.equal(forAttempt.questions.length, 2);
    for (const q of forAttempt.questions) {
      assert.equal(q.correctAnswer, undefined);
      assert.equal(q.explanation, undefined);
    }
  });

  it('computes the score on the server and returns a review', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { createQuiz, getQuizForAttempt, submitAttempt } = await import('../src/services/quizService.js');
    const quiz = await createQuiz(user.id, sampleQuiz());
    const forAttempt = await getQuizForAttempt(user.id, quiz.id);
    const [q1, q2] = forAttempt.questions;
    const result = await submitAttempt(user.id, quiz.id, [
      { questionId: q1.id, answer: q1.options[0] },
      { questionId: q2.id, answer: 'Wrong Answer' }
    ]);
    assert.equal(result.attempt.score, 1);
    assert.equal(result.attempt.totalQuestions, 2);
    assert.equal(result.percentage, 50);
    const events = await prisma.activityLog.count({ where: { userId: user.id, type: 'QUIZ_SUBMITTED' } });
    assert.equal(events, 1);
  });

  it('does not let one user attempt another user\'s quiz', async () => {
    await resetDatabase(prisma);
    const owner = await makeUser();
    const other = await makeUser();
    const { createQuiz, getQuizForAttempt } = await import('../src/services/quizService.js');
    const quiz = await createQuiz(owner.id, sampleQuiz());
    await assert.rejects(() => getQuizForAttempt(other.id, quiz.id), /Quiz not found/);
  });

  it('maps an AI letter-index answer to the concrete option', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { createQuiz, getQuizForAttempt, submitAttempt } = await import('../src/services/quizService.js');
    const quiz = await createQuiz(user.id, {
      questions: [{ prompt: 'Pick the first?', options: ['Alpha', 'Beta', 'Gamma'], correctAnswer: 'B', explanation: 'B maps to Beta.' }]
    });
    const forAttempt = await getQuizForAttempt(user.id, quiz.id);
    const result = await submitAttempt(user.id, quiz.id, [{ questionId: forAttempt.questions[0].id, answer: 'Beta' }]);
    assert.equal(result.attempt.score, 1);
  });

  it('returns an honest empty state for a new student', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { getPerformance } = await import('../src/services/performanceService.js');
    const perf = await getPerformance(user.id);
    assert.equal(perf.hasData, false);
    assert.match(perf.message, /No activity yet/);
  });

  it('reflects a real quiz attempt in accuracy', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { createQuiz, getQuizForAttempt, submitAttempt } = await import('../src/services/quizService.js');
    const { getPerformance } = await import('../src/services/performanceService.js');
    const quiz = await createQuiz(user.id, sampleQuiz());
    const forAttempt = await getQuizForAttempt(user.id, quiz.id);
    await submitAttempt(user.id, quiz.id, forAttempt.questions.map((q) => ({ questionId: q.id, answer: q.options[0] })));
    const perf = await getPerformance(user.id);
    assert.equal(perf.hasData, true);
    assert.equal(perf.quizzes.attempted, 1);
    assert.equal(perf.quizzes.averageAccuracy, 100);
  });

  it('creates, bookmarks, and recommends without fabrication', async () => {
    await resetDatabase(prisma);
    const admin = await prisma.user.create({
      data: { name: 'Admin', email: `a${Date.now()}@t.dev`, passwordHash: 'x', role: 'ADMIN' }
    });
    const student = await makeUser();
    const { createResource, setBookmark, recommendResources, verifyResource } = await import('../src/services/resourceService.js');
    const resource = await createResource(admin.id, {
      title: 'OS Dev Guide', url: 'https://example.com/os', skill: 'Operating Systems', technology: 'Linux', level: 'beginner'
    });
    assert.equal(resource.verified, false);
    const on = await setBookmark(student.id, resource.id, {});
    assert.equal(on.bookmarked, true);
    const off = await setBookmark(student.id, resource.id, {});
    assert.equal(off.bookmarked, false);
    await prisma.profile.create({ data: { userId: student.id, difficultAreas: ['Operating Systems'] } });
    const recsUnverified = await recommendResources(student.id);
    assert.equal(recsUnverified.length, 0);
    await verifyResource(resource.id, true);
    const recs = await recommendResources(student.id);
    assert.ok(recs.some((r) => r.id === resource.id));
  });
});
