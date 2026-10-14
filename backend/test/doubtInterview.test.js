import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres, resetDatabase } from './helpers/postgres.js';

let pg;
let prisma;

const makeUser = async () =>
  prisma.user.create({ data: { name: 'S', email: `s${Date.now()}-${Math.random().toString(36).slice(2)}@t.dev`, passwordHash: 'x' } });

before(async () => {
  pg = await startPostgres();
  process.env.DATABASE_URL = pg.url;
  process.env.DIRECT_URL = pg.url;
  // Force the "no provider configured" path. Setting to '' (not deleting) is
  // deliberate: dotenv does not override variables that already exist, so this
  // prevents backend/.env from repopulating the real keys during the test.
  for (const k of ['GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY']) {
    process.env[k] = '';
  }
  ({ prisma } = await import('../src/config/prisma.js'));
});
after(async () => { await prisma.$disconnect(); await pg.stop(); });

describe('doubt solver fails honestly and isolates by user', () => {
  it('rejects an empty question', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { askDoubt } = await import('../src/services/doubtService.js');
    await assert.rejects(() => askDoubt(user.id, { question: '   ' }), /question is required/i);
  });

  it('returns 503 (not a fabricated answer) when no AI provider is configured', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { askDoubt, getConversation } = await import('../src/services/doubtService.js');
    await assert.rejects(
      () => askDoubt(user.id, { question: 'What is normalization in DBMS?' }),
      (err) => err.statusCode === 503
    );
    // The failure is recorded in history rather than hidden.
    const convos = await prisma.doubtConversation.findMany({ where: { userId: user.id }, include: { messages: true } });
    assert.equal(convos.length, 1);
    assert.ok(convos[0].messages.some((m) => m.sender === 'ASSISTANT' && /unavailable/i.test(m.content)));
  });

  it('does not expose another user\'s conversation', async () => {
    await resetDatabase(prisma);
    const owner = await makeUser();
    const other = await makeUser();
    const convo = await prisma.doubtConversation.create({ data: { userId: owner.id, title: 'private' } });
    const { getConversation } = await import('../src/services/doubtService.js');
    await assert.rejects(() => getConversation(other.id, convo.id), /Conversation not found/);
  });
});

describe('mock interview uses a transparent rubric and never claims hiring prediction', () => {
  it('generates rule-based questions and scores answers', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { startInterview, evaluateInterview } = await import('../src/services/interviewService.js');

    const session = await startInterview(user.id, { role: 'Backend Engineer', interviewType: 'technical', count: 3 });
    assert.equal(session.status, 'IN_PROGRESS');
    assert.ok(session.questions.length >= 1, 'questions generated even without AI');

    const strong = 'I designed a scalable service with caching, database indexing, monitoring, and load testing to optimize performance and handle failures.';
    const result = await evaluateInterview(user.id, session.id, [
      { questionId: session.questions[0].id, answer: strong },
      { questionId: session.questions[1].id, answer: '' }
    ]);
    assert.equal(result.status, 'COMPLETED');
    assert.ok(result.feedback.disclaimer.includes('not a prediction of hiring'), 'explicit non-prediction disclaimer');
    const q0 = result.feedback.perQuestion.find((r) => r.questionId === session.questions[0].id);
    const q1 = result.feedback.perQuestion.find((r) => r.questionId === session.questions[1].id);
    assert.ok(q0.score > q1.score, 'a substantive answer scores higher than an empty one');
  });

  it('requires a target role', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { startInterview } = await import('../src/services/interviewService.js');
    await assert.rejects(() => startInterview(user.id, { role: '' }), /target role is required/i);
  });
});
