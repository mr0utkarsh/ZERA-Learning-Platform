import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';

const router = express.Router();
router.use(authenticate);
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

router.get('/notes', async (req, res, next) => { try { res.json({ success: true, data: await prisma.note.findMany({ where: { userId: req.user.id }, orderBy: { updatedAt: 'desc' } }) }); } catch (e) { next(e); } });
router.post('/notes', async (req, res, next) => { try { const title = String(req.body.title || '').trim(), content = String(req.body.content || '').trim(), category = String(req.body.category || 'Personal').trim(); if (!title || !content) throw fail('Title and content are required.'); const note = await prisma.note.create({ data: { userId: req.user.id, title: title.slice(0, 160), content: content.slice(0, 20000), tags: [category] } }); res.status(201).json({ success: true, data: note }); } catch (e) { next(e); } });
router.delete('/notes/:id', async (req, res, next) => { try { const result = await prisma.note.deleteMany({ where: { id: req.params.id, userId: req.user.id } }); if (!result.count) throw fail('Note not found.', 404); res.json({ success: true, data: { id: req.params.id } }); } catch (e) { next(e); } });

router.get('/study-plans', async (req, res, next) => { try { res.json({ success: true, data: await prisma.studyPlan.findMany({ where: { userId: req.user.id }, orderBy: { updatedAt: 'desc' } }) }); } catch (e) { next(e); } });
router.post('/study-plans', async (req, res, next) => { try { const title = String(req.body.title || '').trim(), description = String(req.body.description || '').trim(); if (!title || !description) throw fail('Plan title and description are required.'); const plan = await prisma.studyPlan.create({ data: { userId: req.user.id, title: title.slice(0, 160), description: description.slice(0, 20000), schedule: req.body.schedule || null } }); res.status(201).json({ success: true, data: plan }); } catch (e) { next(e); } });
router.delete('/study-plans/:id', async (req, res, next) => { try { const result = await prisma.studyPlan.deleteMany({ where: { id: req.params.id, userId: req.user.id } }); if (!result.count) throw fail('Study plan not found.', 404); res.json({ success: true, data: { id: req.params.id } }); } catch (e) { next(e); } });

router.get('/assessment-summary', async (req, res, next) => { try { const [quizAttempts, mockAttempts] = await Promise.all([prisma.quizAttempt.findMany({ where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: 20, include: { quiz: { select: { title: true } } } }), prisma.mockTestAttempt.findMany({ where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: 20, include: { mockTest: { select: { title: true } } } })]); res.json({ success: true, data: { quizAttempts, mockAttempts } }); } catch (e) { next(e); } });
router.get('/quizzes', async (req, res, next) => { try { res.json({ success: true, data: await prisma.quiz.findMany({ include: { questions: { select: { id: true, prompt: true, options: true, type: true } } }, orderBy: { createdAt: 'desc' } }) }); } catch (e) { next(e); } });
router.post('/quizzes/:quizId/attempts', async (req, res, next) => { try { const quiz = await prisma.quiz.findUnique({ where: { id: req.params.quizId }, include: { questions: true } }); if (!quiz) throw fail('Quiz not found.', 404); const answers = req.body.answers || {}; const score = quiz.questions.reduce((total, q) => total + (answers[q.id] === q.correctAnswer ? 1 : 0), 0); const attempt = await prisma.quizAttempt.create({ data: { userId: req.user.id, quizId: quiz.id, score, totalQuestions: quiz.questions.length, answers, submittedAt: new Date() } }); res.status(201).json({ success: true, data: { id: attempt.id, score, totalQuestions: quiz.questions.length } }); } catch (e) { next(e); } });
export default router;
