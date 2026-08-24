import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';
import {
  aiStatus,
  generateDoubtAnswer,
  generateStudyNote,
  generateQuiz,
  generateStudyPlan,
  generateMockInterview
} from '../services/aiService.js';

const router = express.Router();
router.use(authenticate);

router.get('/status', async (req, res, next) => {
  try {
    res.json({ success: true, data: aiStatus() });
  } catch (error) {
    next(error);
  }
});

router.post('/doubt-solver', async (req, res, next) => {
  try {
    const result = await generateDoubtAnswer(req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/notes', async (req, res, next) => {
  try {
    const result = await generateStudyNote(req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/quiz', async (req, res, next) => {
  try {
    const result = await generateQuiz(req.body || {});
    const questions = result.questions.filter((question) => question.prompt && Array.isArray(question.options) && question.correctAnswer).map((question) => ({
      prompt: String(question.prompt).slice(0, 500),
      options: question.options,
      correctAnswer: String(question.correctAnswer).slice(0, 500),
      explanation: question.explanation ? String(question.explanation).slice(0, 1000) : null
    }));
    if (!questions.length) throw new Error('The AI provider returned no valid quiz questions.');
    const quiz = await prisma.quiz.create({
      data: {
        courseId: req.body.courseId || null,
        title: String(result.title).slice(0, 160),
        description: result.description ? String(result.description).slice(0, 1000) : null,
        questions: { create: questions }
      },
      include: { questions: { select: { id: true, prompt: true, options: true, explanation: true } } }
    });
    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
});

router.post('/study-plan', async (req, res, next) => {
  try {
    const result = await generateStudyPlan(req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/mock-interview', async (req, res, next) => {
  try {
    const result = await generateMockInterview(req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
