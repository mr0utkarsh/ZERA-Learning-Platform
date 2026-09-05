import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, app, prisma, signupStudent, createQuizDirectly } from './helpers.mjs';

const QUESTIONS = [
  { type: 'MCQ', text: '2 + 2 = ?', choices: ['3', '4', '5', '6'], correctIndex: 1, explanation: 'Basic arithmetic' },
  { type: 'MCQ', text: 'Capital of France?', choices: ['Rome', 'Berlin', 'Paris', 'Madrid'], correctIndex: 2, explanation: 'Paris' },
  { type: 'TRUE_FALSE', text: 'The Earth orbits the Sun.', choices: ['True', 'False'], correctIndex: 0, explanation: 'Yes' },
  { type: 'SHORT_ANSWER', text: 'Define normalization.', modelAnswer: 'Removing redundancy via normal forms.' },
];

describe('Quiz scoring', () => {
  let agent;
  let userId;

  beforeAll(async () => {
    await prisma.quizAttempt.deleteMany({});
    await prisma.quiz.deleteMany({});
    await prisma.user.deleteMany({});
    agent = request.agent(app);
    const { res } = await signupStudent(agent);
    userId = res.body.data.user.id;
  });
  afterAll(async () => prisma.$disconnect());

  it('never exposes answers before submission', async () => {
    const quiz = await createQuizDirectly(userId, QUESTIONS);
    const res = await agent.get(`/api/quizzes/${quiz.id}`);
    expect(res.status).toBe(200);
    const qs = res.body.data.quiz.questions;
    expect(qs[0].correctIndex).toBeUndefined();
    expect(qs[0].explanation).toBeUndefined();
    expect(qs[3].modelAnswer).toBeUndefined();
  });

  it('grades an attempt correctly on submission', async () => {
    const quiz = await createQuizDirectly(userId, QUESTIONS);
    const start = await agent.post(`/api/quizzes/${quiz.id}/attempts`);
    expect(start.status).toBe(201);
    const attemptId = start.body.data.attempt.id;

    // Correct MCQ1 (1), wrong MCQ2 (0), correct TF (1), short answer present
    const submit = await agent.post(`/api/quizzes/attempts/${attemptId}/submit`).send({
      answers: [1, 0, 0, 'Removing data redundancy using normal forms'],
      timeTakenSec: 90,
    });
    expect(submit.status).toBe(200);
    const attempt = submit.body.data.attempt;
    expect(attempt.status).toBe('COMPLETED');
    expect(attempt.correctCount).toBe(2); // MCQ1 + TF
    expect(attempt.incorrectCount).toBe(1); // MCQ2
    expect(attempt.score).toBe(2);
    // percentage over auto-gradable questions only (3) => 66.7
    expect(attempt.percentage).toBeCloseTo(66.7, 1);
    expect(attempt.timeTakenSec).toBe(90);
  });

  it('resumes an in-progress attempt instead of creating duplicates', async () => {
    const quiz = await createQuizDirectly(userId, QUESTIONS);
    const first = await agent.post(`/api/quizzes/${quiz.id}/attempts`);
    const second = await agent.post(`/api/quizzes/${quiz.id}/attempts`);
    expect(first.body.data.attempt.id).toBe(second.body.data.attempt.id);
  });

  it('persists answers (refresh-safe) and can submit later', async () => {
    const quiz = await createQuizDirectly(userId, QUESTIONS);
    const start = await agent.post(`/api/quizzes/${quiz.id}/attempts`);
    const attemptId = start.body.data.attempt.id;

    await agent.post(`/api/quizzes/attempts/${attemptId}/answers`).send({ answers: [1, 2, 0, 'ans'] });
    // Submit with NO body -> server uses saved answers
    const submit = await agent.post(`/api/quizzes/attempts/${attemptId}/submit`).send({});
    expect(submit.body.data.attempt.correctCount).toBe(3);
    expect(submit.body.data.attempt.percentage).toBe(100);
  });

  it('review after submission includes correct answers and explanations', async () => {
    const quiz = await createQuizDirectly(userId, QUESTIONS);
    const start = await agent.post(`/api/quizzes/${quiz.id}/attempts`);
    const submit = await agent.post(`/api/quizzes/attempts/${start.body.data.attempt.id}/submit`).send({ answers: [1, 2, 0, 'x'] });
    const review = await agent.get(`/api/quizzes/attempts/${submit.body.data.attempt.id}/review`);
    expect(review.status).toBe(200);
    expect(review.body.data.questions[0].correctIndex).toBe(1);
    expect(review.body.data.questions[0].explanation).toBeTruthy();
    expect(review.body.data.questions[3].modelAnswer).toBeTruthy();
  });

  it('students cannot access each other\'s private quizzes', async () => {
    const quiz = await createQuizDirectly(userId, QUESTIONS);
    const intruder = request.agent(app);
    await signupStudent(intruder);
    await intruder.post('/api/auth/login').send({});
    const res = await intruder.get(`/api/quizzes/${quiz.id}`);
    expect(res.status).toBe(403);
  });

  it('AI quiz generation reports "not configured" (no fake questions)', async () => {
    const res = await agent.post('/api/quizzes/generate').send({ subject: 'DBMS', count: 5 });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_NOT_CONFIGURED');
    // and nothing fake was stored
    const count = await prisma.quiz.count({ where: { title: { contains: 'Quiz — DBMS' } } });
    expect(count).toBe(0);
  });
});
