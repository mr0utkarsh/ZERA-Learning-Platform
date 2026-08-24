import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';

const router = express.Router();
router.use(authenticate);
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

router.get('/pyqs', async (req, res, next) => {
	try {
		const where = {};
		if (req.query.courseId) where.courseId = String(req.query.courseId);
		if (req.query.subjectId) where.subjectId = String(req.query.subjectId);
		if (req.query.topicId) where.topicId = String(req.query.topicId);
		if (req.query.year && Number.isInteger(Number(req.query.year))) where.year = Number(req.query.year);
		if (req.query.search) where.question = { contains: String(req.query.search).slice(0, 120) };
		const items = await prisma.pyq.findMany({ where, orderBy: [{ year: 'desc' }, { createdAt: 'desc' }], include: { course: { select: { title: true } } } });
		res.json({ success: true, data: items });
	} catch (error) { next(error); }
});

router.get('/resources', async (req, res, next) => {
	try {
		const where = {};
		if (req.query.courseId) where.courseId = String(req.query.courseId);
		if (req.query.subjectId) where.subjectId = String(req.query.subjectId);
		if (req.query.topicId) where.topicId = String(req.query.topicId);
		if (req.query.type) where.resourceType = String(req.query.type).slice(0, 40);
		if (req.query.search) where.OR = [{ title: { contains: String(req.query.search).slice(0, 120) } }, { description: { contains: String(req.query.search).slice(0, 120) } }];
		const items = await prisma.resource.findMany({ where, orderBy: { createdAt: 'desc' }, include: { course: { select: { title: true } } } });
		res.json({ success: true, data: items });
	} catch (error) { next(error); }
});

router.get('/profile', async (req, res, next) => {
	try {
		const [user, profile] = await Promise.all([
			prisma.user.findUnique({
				where: { id: req.user.id },
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					status: true,
					createdAt: true,
					updatedAt: true
				}
			}),
			prisma.profile.findUnique({
				where: { userId: req.user.id }
			})
		]);

		res.json({ success: true, data: { user, profile } });
	} catch (error) {
		next(error);
	}
});

router.get('/bookmarks', async (req, res, next) => {
	try {
		const items = await prisma.bookmark.findMany({
			where: { userId: req.user.id },
			orderBy: { createdAt: 'desc' }
		});

		res.json({ success: true, data: items });
	} catch (error) {
		next(error);
	}
});

router.post('/bookmarks', async (req, res, next) => {
	try {
		const title = String(req.body.title || '').trim();
		const notes = String(req.body.notes || '').trim();
		const url = String(req.body.url || '').trim();

		if (!title) throw fail('Bookmark title is required.', 400);

		const bookmark = await prisma.bookmark.create({
			data: {
				userId: req.user.id,
				title: title.slice(0, 160),
				url: url || null,
				notes: notes || null,
				courseId: req.body.courseId || null,
				lessonId: req.body.lessonId || null
			}
		});

		res.status(201).json({ success: true, data: bookmark });
	} catch (error) {
		next(error);
	}
});

router.delete('/bookmarks/:id', async (req, res, next) => {
	try {
		const result = await prisma.bookmark.deleteMany({
			where: { id: req.params.id, userId: req.user.id }
		});

		if (!result.count) throw fail('Bookmark not found.', 404);

		res.json({ success: true, data: { id: req.params.id } });
	} catch (error) {
		next(error);
	}
});

router.get('/notifications', async (req, res, next) => {
	try {
		const items = await prisma.notification.findMany({
			where: { userId: req.user.id },
			orderBy: { createdAt: 'desc' }
		});

		res.json({ success: true, data: items });
	} catch (error) {
		next(error);
	}
});

router.post('/notifications', async (req, res, next) => {
	try {
		const title = String(req.body.title || '').trim();
		const message = String(req.body.message || '').trim();
		const type = String(req.body.type || 'INFO').trim().slice(0, 40);

		if (!title || !message) throw fail('Notification title and message are required.', 400);

		const notification = await prisma.notification.create({
			data: {
				userId: req.user.id,
				title: title.slice(0, 160),
				message: message.slice(0, 20000),
				type
			}
		});

		res.status(201).json({ success: true, data: notification });
	} catch (error) {
		next(error);
	}
});

router.put('/notifications/:id/read', async (req, res, next) => {
	try {
		const item = await prisma.notification.updateMany({
			where: { id: req.params.id, userId: req.user.id },
			data: { isRead: true }
		});

		if (!item.count) throw fail('Notification not found.', 404);

		res.json({ success: true, data: { id: req.params.id, isRead: true } });
	} catch (error) {
		next(error);
	}
});

router.get('/support-requests', async (req, res, next) => {
	try {
		const items = await prisma.supportRequest.findMany({
			where: { userId: req.user.id },
			orderBy: { createdAt: 'desc' }
		});

		res.json({ success: true, data: items });
	} catch (error) {
		next(error);
	}
});

router.post('/support-requests', async (req, res, next) => {
	try {
		const category = String(req.body.category || '').trim();
		const subject = String(req.body.subject || '').trim();
		const message = String(req.body.message || '').trim();

		if (!category || !subject || !message) {
			throw fail('Category, subject, and message are required.', 400);
		}

		const requestEntry = await prisma.supportRequest.create({
			data: {
				userId: req.user.id,
				category: category.slice(0, 80),
				subject: subject.slice(0, 160),
				message: message.slice(0, 20000)
			}
		});

		res.status(201).json({ success: true, data: requestEntry });
	} catch (error) {
		next(error);
	}
});

router.get('/notes', async (req, res, next) => { try { res.json({ success: true, data: await prisma.note.findMany({ where: { userId: req.user.id }, orderBy: { updatedAt: 'desc' } }) }); } catch (e) { next(e); } });
router.post('/notes', async (req, res, next) => { try { const title = String(req.body.title || '').trim(), content = String(req.body.content || '').trim(), category = String(req.body.category || 'Personal').trim(); if (!title || !content) throw fail('Title and content are required.'); const note = await prisma.note.create({ data: { userId: req.user.id, title: title.slice(0, 160), content: content.slice(0, 20000), tags: [category] } }); res.status(201).json({ success: true, data: note }); } catch (e) { next(e); } });
router.delete('/notes/:id', async (req, res, next) => { try { const result = await prisma.note.deleteMany({ where: { id: req.params.id, userId: req.user.id } }); if (!result.count) throw fail('Note not found.', 404); res.json({ success: true, data: { id: req.params.id } }); } catch (e) { next(e); } });

router.get('/study-plans', async (req, res, next) => { try { res.json({ success: true, data: await prisma.studyPlan.findMany({ where: { userId: req.user.id }, orderBy: { updatedAt: 'desc' } }) }); } catch (e) { next(e); } });
router.post('/study-plans', async (req, res, next) => { try { const title = String(req.body.title || '').trim(), description = String(req.body.description || '').trim(); if (!title || !description) throw fail('Plan title and description are required.'); const plan = await prisma.studyPlan.create({ data: { userId: req.user.id, title: title.slice(0, 160), description: description.slice(0, 20000), schedule: req.body.schedule || null } }); res.status(201).json({ success: true, data: plan }); } catch (e) { next(e); } });
router.delete('/study-plans/:id', async (req, res, next) => { try { const result = await prisma.studyPlan.deleteMany({ where: { id: req.params.id, userId: req.user.id } }); if (!result.count) throw fail('Study plan not found.', 404); res.json({ success: true, data: { id: req.params.id } }); } catch (e) { next(e); } });

router.get('/mock-tests', async (req, res, next) => {
	try {
		const tests = await prisma.mockTest.findMany({
			orderBy: { createdAt: 'desc' },
			include: {
				questions: { orderBy: { sequence: 'asc' }, select: { id: true, prompt: true, options: true, sequence: true } },
				attempts: { where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: 10 }
			}
		});

		res.json({ success: true, data: tests });
	} catch (error) {
		next(error);
	}
});

router.post('/mock-tests/:mockTestId/attempts', async (req, res, next) => {
	try {
		const mockTest = await prisma.mockTest.findUnique({ where: { id: req.params.mockTestId }, include: { questions: true } });
		if (!mockTest) throw fail('Mock test not found.', 404);

		const answers = req.body.answers || {};
		const score = mockTest.questions.reduce((total, question) => total + (answers[question.id] === question.correctAnswer ? 1 : 0), 0);
		const totalQuestions = mockTest.questions.length;

		const attempt = await prisma.mockTestAttempt.create({
			data: {
				userId: req.user.id,
				mockTestId: mockTest.id,
				score,
				totalQuestions,
				answers,
				submittedAt: new Date()
			}
		});

		res.status(201).json({ success: true, data: { id: attempt.id, score, totalQuestions } });
	} catch (error) {
		next(error);
	}
});

router.get('/assessment-summary', async (req, res, next) => { try { const [quizAttempts, mockAttempts] = await Promise.all([prisma.quizAttempt.findMany({ where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: 20, include: { quiz: { select: { title: true } } } }), prisma.mockTestAttempt.findMany({ where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: 20, include: { mockTest: { select: { title: true } } } })]); res.json({ success: true, data: { quizAttempts, mockAttempts } }); } catch (e) { next(e); } });
router.get('/performance', async (req, res, next) => { try { const [courses, quizAttempts, mockAttempts] = await Promise.all([prisma.progress.findMany({ where: { userId: req.user.id }, include: { course: { select: { title: true } } } }), prisma.quizAttempt.findMany({ where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: 20 }), prisma.mockTestAttempt.findMany({ where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: 20 })]); const attempts = [...quizAttempts, ...mockAttempts]; const total = attempts.reduce((sum, attempt) => sum + attempt.totalQuestions, 0); const score = attempts.reduce((sum, attempt) => sum + attempt.score, 0); res.json({ success: true, data: { averageScorePercentage: total ? Math.round(score / total * 100) : 0, attempts: attempts.length, courses } }); } catch (e) { next(e); } });
router.get('/quizzes', async (req, res, next) => { try { res.json({ success: true, data: await prisma.quiz.findMany({ include: { questions: { select: { id: true, prompt: true, options: true, type: true } } }, orderBy: { createdAt: 'desc' } }) }); } catch (e) { next(e); } });
router.post('/quizzes/:quizId/attempts', async (req, res, next) => { try { const quiz = await prisma.quiz.findUnique({ where: { id: req.params.quizId }, include: { questions: true } }); if (!quiz) throw fail('Quiz not found.', 404); const answers = req.body.answers || {}; const score = quiz.questions.reduce((total, q) => total + (answers[q.id] === q.correctAnswer ? 1 : 0), 0); const attempt = await prisma.quizAttempt.create({ data: { userId: req.user.id, quizId: quiz.id, score, totalQuestions: quiz.questions.length, answers, submittedAt: new Date() } }); res.status(201).json({ success: true, data: { id: attempt.id, score, totalQuestions: quiz.questions.length } }); } catch (e) { next(e); } });
export default router;
