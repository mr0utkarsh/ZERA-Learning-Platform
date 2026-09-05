import { createRequire } from 'module';

// The backend is CommonJS; load it natively instead of through Vite's
// ESM transform (which only handles the vitest imports themselves).
const require = createRequire(import.meta.url);
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

let counter = 0;
const uniqueEmail = () => `user${Date.now()}-${++counter}@test.zera`;

async function signupStudent(agent, overrides = {}) {
  const payload = {
    name: 'Test Student',
    email: uniqueEmail(),
    password: 'Passw0rd123',
    confirmPassword: 'Passw0rd123',
    ...overrides,
  };
  const res = await agent.post('/api/auth/signup').send(payload);
  return { res, payload };
}

async function createCourseWithLessons(userId, { subjects = 1, lessonsPerTopic = 2 } = {}) {
  return prisma.course.create({
    data: {
      name: 'Test Course',
      userId,
      subjects: {
        create: Array.from({ length: subjects }, (_, si) => ({
          name: `Subject ${si + 1}`,
          order: si,
          units: {
            create: [{
              name: 'Unit 1',
              order: 0,
              chapters: {
                create: [{
                  name: 'Chapter 1',
                  order: 0,
                  topics: {
                    create: [{
                      name: 'Topic 1',
                      order: 0,
                      lessons: {
                        create: Array.from({ length: lessonsPerTopic }, (_, li) => ({
                          title: `Lesson ${li + 1}`,
                          order: li,
                          content: `Content for lesson ${li + 1}`,
                        })),
                      },
                    }],
                  },
                }],
              },
            }],
          },
        })),
      },
    },
    include: { subjects: { include: { units: { include: { chapters: { include: { topics: { include: { lessons: true } } } } } } } } },
  });
}

async function createQuizDirectly(userId, questions, type = 'QUIZ') {
  return prisma.quiz.create({
    data: {
      userId,
      title: `Test ${type}`,
      type,
      subjectName: 'TestSubject',
      difficulty: 'MEDIUM',
      timeLimitMin: type === 'MOCK_TEST' ? 30 : null,
      questions: JSON.stringify(questions),
    },
  });
}

export { request, app, prisma, bcrypt, uniqueEmail, signupStudent, createCourseWithLessons, createQuizDirectly };
