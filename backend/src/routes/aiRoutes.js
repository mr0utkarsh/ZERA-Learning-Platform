import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
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
    res.json({ success: true, data: result });
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
