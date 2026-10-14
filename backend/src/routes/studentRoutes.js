import express from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';

const router = express.Router();
router.use(authenticate);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fail = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

// ─── Notes ───────────────────────────────────────────────────────────────────
router.get('/notes', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await prisma.note.findMany({
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' }
      })
    });
  } catch (e) { next(e); }
});

router.post('/notes', async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const category = String(req.body.category || 'Personal').trim();
    if (!title || !content) throw fail('Title and content are required.');
    const note = await prisma.note.create({
      data: {
        userId: req.user.id,
        title: title.slice(0, 160),
        content: content.slice(0, 20000),
        tags: [category]
      }
    });
    res.status(201).json({ success: true, data: note });
  } catch (e) { next(e); }
});

router.patch('/notes/:id', async (req, res, next) => {
  try {
    const existing = await prisma.note.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!existing) throw fail('Note not found.', 404);
    const title = req.body.title !== undefined ? String(req.body.title).trim().slice(0, 160) : existing.title;
    const content = req.body.content !== undefined ? String(req.body.content).trim().slice(0, 20000) : existing.content;
    const tags = req.body.category ? [String(req.body.category).trim()] : existing.tags;
    const note = await prisma.note.update({
      where: { id: req.params.id },
      data: { title, content, tags }
    });
    res.json({ success: true, data: note });
  } catch (e) { next(e); }
});

router.delete('/notes/:id', async (req, res, next) => {
  try {
    const result = await prisma.note.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!result.count) throw fail('Note not found.', 404);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
});

// ─── Handwritten Notes ────────────────────────────────────────────────────────
router.get('/handwritten-notes', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await prisma.handwrittenNote.findMany({
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, updatedAt: true, createdAt: true }
      })
    });
  } catch (e) { next(e); }
});

router.post('/handwritten-notes', async (req, res, next) => {
  try {
    const title = String(req.body.title || 'Untitled drawing').trim().slice(0, 160);
    const drawing = req.body.drawing;
    if (!drawing || !Array.isArray(drawing)) throw fail('Drawing data is required.');
    const preview = typeof req.body.preview === 'string' ? req.body.preview.slice(0, 500000) : null;
    const note = await prisma.handwrittenNote.create({
      data: { userId: req.user.id, title, drawing, preview }
    });
    res.status(201).json({ success: true, data: { id: note.id, title: note.title, updatedAt: note.updatedAt } });
  } catch (e) { next(e); }
});

router.delete('/handwritten-notes/:id', async (req, res, next) => {
  try {
    const result = await prisma.handwrittenNote.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!result.count) throw fail('Handwritten note not found.', 404);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
});

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/settings', async (req, res, next) => {
  try {
    let settings = await prisma.userSettings.findUnique({ where: { userId: req.user.id } });
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: req.user.id, theme: 'LIGHT', motionReduced: false }
      });
    }
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

router.put('/settings', async (req, res, next) => {
  try {
    const allowedThemes = ['LIGHT', 'DARK'];
    const theme = allowedThemes.includes(String(req.body.theme || '').toUpperCase())
      ? String(req.body.theme).toUpperCase()
      : 'LIGHT';
    const motionReduced = Boolean(req.body.motionReduced);
    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: { theme, motionReduced },
      create: { userId: req.user.id, theme, motionReduced }
    });
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      include: { user: { select: { name: true, email: true, role: true, createdAt: true } } }
    });
    res.json({ success: true, data: profile });
  } catch (e) { next(e); }
});

router.patch('/profile', async (req, res, next) => {
  try {
    const fields = {};
    if (req.body.phone !== undefined) fields.phone = String(req.body.phone).trim().slice(0, 20) || null;
    if (req.body.bio !== undefined) fields.bio = String(req.body.bio).trim().slice(0, 500) || null;
    if (req.body.city !== undefined) fields.city = String(req.body.city).trim().slice(0, 120) || null;
    if (req.body.institution !== undefined) fields.institution = String(req.body.institution).trim().slice(0, 160) || null;
    if (req.body.graduationYear !== undefined) {
      const yr = parseInt(req.body.graduationYear, 10);
      if (!isNaN(yr) && yr >= 1990 && yr <= 2100) fields.graduationYear = yr;
    }
    const profile = await prisma.profile.upsert({
      where: { userId: req.user.id },
      update: fields,
      create: { userId: req.user.id, ...fields }
    });
    res.json({ success: true, data: profile });
  } catch (e) { next(e); }
});

// ─── Study Plans ─────────────────────────────────────────────────────────────
router.get('/study-plans', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await prisma.studyPlan.findMany({
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' }
      })
    });
  } catch (e) { next(e); }
});

router.post('/study-plans', async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    if (!title || !description) throw fail('Plan title and description are required.');
    const plan = await prisma.studyPlan.create({
      data: {
        userId: req.user.id,
        title: title.slice(0, 160),
        description: description.slice(0, 20000),
        schedule: req.body.schedule || null
      }
    });
    res.status(201).json({ success: true, data: plan });
  } catch (e) { next(e); }
});

router.patch('/study-plans/:id', async (req, res, next) => {
  try {
    const existing = await prisma.studyPlan.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!existing) throw fail('Study plan not found.', 404);
    const updates = {};
    if (req.body.title !== undefined) updates.title = String(req.body.title).trim().slice(0, 160);
    if (req.body.description !== undefined) updates.description = String(req.body.description).trim().slice(0, 20000);
    if (req.body.schedule !== undefined) updates.schedule = req.body.schedule;
    if (req.body.status !== undefined) updates.status = String(req.body.status).trim().slice(0, 20);
    const plan = await prisma.studyPlan.update({ where: { id: req.params.id }, data: updates });
    res.json({ success: true, data: plan });
  } catch (e) { next(e); }
});

router.delete('/study-plans/:id', async (req, res, next) => {
  try {
    const result = await prisma.studyPlan.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!result.count) throw fail('Study plan not found.', 404);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
});

// ─── Bookmarks ────────────────────────────────────────────────────────────────
router.get('/bookmarks', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await prisma.bookmark.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: { course: { select: { title: true } }, lesson: { select: { title: true } } }
      })
    });
  } catch (e) { next(e); }
});

router.post('/bookmarks', async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) throw fail('Bookmark title is required.');
    const bookmark = await prisma.bookmark.create({
      data: {
        userId: req.user.id,
        title: title.slice(0, 255),
        url: req.body.url ? String(req.body.url).trim().slice(0, 2048) : null,
        notes: req.body.notes ? String(req.body.notes).trim().slice(0, 2000) : null,
        courseId: req.body.courseId || null,
        lessonId: req.body.lessonId || null
      }
    });
    res.status(201).json({ success: true, data: bookmark });
  } catch (e) { next(e); }
});

router.delete('/bookmarks/:id', async (req, res, next) => {
  try {
    const result = await prisma.bookmark.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!result.count) throw fail('Bookmark not found.', 404);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
});

// ─── Notifications ────────────────────────────────────────────────────────────
router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, data: notifications });
  } catch (e) { next(e); }
});

router.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    const n = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!n) throw fail('Notification not found.', 404);
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.patch('/notifications/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ─── Quiz Attempts & Assessment Summary ──────────────────────────────────────
router.get('/assessment-summary', async (req, res, next) => {
  try {
    const [quizAttempts, mockAttempts] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { userId: req.user.id },
        orderBy: { startedAt: 'desc' },
        take: 20,
        include: { quiz: { select: { title: true } } }
      }),
      prisma.mockTestAttempt.findMany({
        where: { userId: req.user.id },
        orderBy: { startedAt: 'desc' },
        take: 20,
        include: { mockTest: { select: { title: true } } }
      })
    ]);
    res.json({ success: true, data: { quizAttempts, mockAttempts } });
  } catch (e) { next(e); }
});

router.get('/quizzes', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await prisma.quiz.findMany({
        include: {
          questions: {
            select: { id: true, prompt: true, options: true, type: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    });
  } catch (e) { next(e); }
});

router.post('/quizzes/:quizId/attempts', async (req, res, next) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.quizId },
      include: { questions: true }
    });
    if (!quiz) throw fail('Quiz not found.', 404);
    const answers = req.body.answers || {};
    const score = quiz.questions.reduce(
      (total, q) => total + (answers[q.id] === q.correctAnswer ? 1 : 0), 0
    );
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: req.user.id,
        quizId: quiz.id,
        score,
        totalQuestions: quiz.questions.length,
        answers,
        submittedAt: new Date()
      }
    });
    res.status(201).json({
      success: true,
      data: { id: attempt.id, score, totalQuestions: quiz.questions.length }
    });
  } catch (e) { next(e); }
});

// ─── Mock Tests ─────────────────────────────────────────────────────────────
router.get('/mock-tests', async (req, res, next) => {
  try {
    let mockTests = await prisma.mockTest.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // If no mock test exists yet, create a default foundations mock test
    if (mockTests.length === 0) {
      const defaultTest = await prisma.mockTest.create({
        data: {
          title: 'ZERA General Aptitude & Foundations Mock Test',
          description: 'A comprehensive mock assessment covering learning habits, problem solving, and aptitude.',
          durationMin: 30
        }
      });
      mockTests = [defaultTest];
    }

    res.json({ success: true, data: mockTests });
  } catch (e) { next(e); }
});

router.post('/mock-tests/:id/attempts', async (req, res, next) => {
  try {
    const mockTest = await prisma.mockTest.findUnique({
      where: { id: req.params.id }
    });
    if (!mockTest) throw fail('Mock test not found.', 404);

    const score = Number(req.body.score || 0);
    const totalQuestions = Number(req.body.total || req.body.totalQuestions || 3);
    const answers = req.body.answers || null;

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

    res.status(201).json({
      success: true,
      data: { id: attempt.id, score, totalQuestions }
    });
  } catch (e) { next(e); }
});

// ─── Support Requests ─────────────────────────────────────────────────────────
const handleGetSupport = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await prisma.supportRequest.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      })
    });
  } catch (e) { next(e); }
};

const handlePostSupport = async (req, res, next) => {
  try {
    const category = String(req.body.category || 'General').trim();
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();
    if (!subject || !message) throw fail('Subject and message are required.');
    const request = await prisma.supportRequest.create({
      data: {
        userId: req.user.id,
        category: category.slice(0, 80),
        subject: subject.slice(0, 200),
        message: message.slice(0, 10000)
      }
    });
    res.status(201).json({ success: true, data: request });
  } catch (e) { next(e); }
};

router.get('/support', handleGetSupport);
router.post('/support', handlePostSupport);
router.get('/support-requests', handleGetSupport);
router.post('/support-requests', handlePostSupport);


// ─── Previous Year Questions (PYQs) ──────────────────────────────────────────
router.get('/pyqs', async (req, res, next) => {
  try {
    const { subject, year, courseId } = req.query;
    const where = {};
    if (subject) where.subject = { contains: String(subject), mode: 'insensitive' };
    if (year) where.year = parseInt(year, 10);
    if (courseId) where.courseId = String(courseId);
    res.json({
      success: true,
      data: await prisma.previousQuestion.findMany({
        where,
        orderBy: [{ subject: 'asc' }, { year: 'desc' }]
      })
    });
  } catch (e) { next(e); }
});



// Syllabus history (list, open, delete)
router.get('/syllabus', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { userId: req.user.id };
    if (status) where.analysisStatus = status;
    res.json({
      success: true,
      data: await prisma.syllabusUpload.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, fileName: true, sizeBytes: true, mimeType: true, analysisStatus: true, analysis: true, createdAt: true }
      })
    });
  } catch (e) { next(e); }
});
router.get('/syllabus/:id', async (req, res, next) => {
  try {
    const upload = await prisma.syllabusUpload.findUnique({ where: { id: req.params.id, userId: req.user.id } });
    if (!upload) throw fail('Record not found.', 404);
    res.json({ success: true, data: upload });
  } catch (e) { next(e); }
});
router.delete('/syllabus/:id', async (req, res, next) => {
  try {
    const result = await prisma.syllabusUpload.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    if (!result.count) throw fail('Record not found.', 404);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
});

// Analyze saved syllabus with server-side AI
router.post('/syllabus/:id/analyze', async (req, res, next) => {
  try {
    const upload = await prisma.syllabusUpload.findUnique({ where: { id: req.params.id, userId: req.user.id } });
    if (!upload) throw fail('Record not found.', 404);
    if (!upload.extractedText) throw fail('Extracted text available for analysis.', 422);
    const mod = await import('../services/aiService.js');
    const out = await mod.analyzeSyllabusWithAi(upload.extractedText);
    const updated = await prisma.syllabusUpload.update({ where: { id: upload.id }, data: { analysis: out.analysis, analysisStatus: 'AI_ANALYZED', aiError: null } });
    res.json({ success: true, data: Object.assign({}, updated, { provider: out.provider }) });
  } catch (e) { next(e); }
});

// Quiz attempt history
router.get('/quiz-attempts', async (req, res, next) => {
  try {
    const attempts = await prisma.quizAttempt.findMany({ where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: 20, include: { quiz: { select: { id: true, title: true } } } });
    res.json({ success: true, data: attempts });
  } catch (e) { next(e); }
});
// Study-plan tasks (view, toggle complete)
router.get('/study-plan/:id', async (req, res, next) => {
  try {
    const plan = await prisma.studyPlan.findUnique({ where: { id: req.params.id, userId: req.user.id }, include: { tasks: true } });
    if (!plan) throw fail('Plan not found.', 404);
    res.json({ success: true, data: plan });
  } catch (e) { next(e); }
});
router.patch('/study-plan/:id/task/:taskId', async (req, res, next) => {
  try {
    const plan = await prisma.studyPlan.findUnique({ where: { id: req.params.id, userId: req.user.id } });
    if (!plan) throw fail('Plan not found.', 404);
    const task = plan.tasks.find((t) => t.id === req.params.taskId);
    if (!task) throw fail('Not found.', 404);
    const done = !task.isCompleted;
    const updated = await prisma.studyTask.update({ where: { id: task.id }, data: { isCompleted: done, completedAt: done ? new Date() : null } });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

// Dashboard from real events only
router.get('/dashboard', async (req, res, next) => {
  try {
    const qa = await prisma.quizAttempt.findMany({ where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: 10, include: { quiz: { select: { id: true, title: true } } } });
    const ma = await prisma.mockTestAttempt.findMany({ where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: 10, include: { mockTest: { select: { id: true, title: true } } } });
    const lc = await prisma.lessonCompletion.count({ where: { userId: req.user.id } });
    const ac = await prisma.activityLog.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 12, select: { id: true, type: true, score: true, total: true, createdAt: true } });
    const subs = qa.concat(ma);
    let ts = 0; let tq = 0;
    for (const a of subs) { ts += (a.score || 0); tq += (a.totalQuestions || a.total || 0); }
    res.json({ success: true, data: { quizAttempts: qa, mockAttempts: ma, submissions: subs, totalScore: ts, totalQuestions: tq, lessonCompletions: lc, activity: ac, overallProgress: 0, overallProgressNote: 'Progress is tracked per course once you save a syllabus and complete lessons.' } });
  } catch (e) { next(e); }
});
export default router;
