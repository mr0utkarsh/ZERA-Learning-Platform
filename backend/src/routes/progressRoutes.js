import express from 'express';
import { authenticate, requireStudent } from '../middleware/authMiddleware.js';
import { syllabusProgress, updateTopic, initProgress } from '../controllers/progressController.js';
import { topicStatusSchema, validateRequest } from '../utils/validators.js';

const router = express.Router();
router.use(authenticate);
router.use(requireStudent);

// Initialise NOT_STARTED rows for every topic in a syllabus (idempotent).
router.post('/syllabus/:id/init', initProgress);
// Full breakdown: overall + per-subject + per-unit + per-topic.
router.get('/syllabus/:id', syllabusProgress);
// Manual status update for a single topic.
router.patch('/topics/:topicId', validateRequest(topicStatusSchema), updateTopic);

export default router;
