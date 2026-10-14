import express from 'express';
import { authenticate, requireStudent } from '../middleware/authMiddleware.js';
import { start, evaluate, list, get } from '../controllers/interviewController.js';
import { interviewStartSchema, interviewEvaluateSchema, validateRequest } from '../utils/validators.js';

const router = express.Router();
router.use(authenticate);
router.use(requireStudent);

router.get('/', list);
router.post('/', validateRequest(interviewStartSchema), start);
router.get('/:id', get);
router.post('/:id/evaluate', validateRequest(interviewEvaluateSchema), evaluate);

export default router;
