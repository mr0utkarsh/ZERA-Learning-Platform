import express from 'express';
import { authenticate, requireStudent } from '../middleware/authMiddleware.js';
import { generate, list, get, summary, complete, skip, reschedule } from '../controllers/studyPlanController.js';
import { studyPlanGenerateSchema, taskRescheduleSchema, validateRequest } from '../utils/validators.js';

const router = express.Router();
router.use(authenticate);
router.use(requireStudent);

router.post('/', validateRequest(studyPlanGenerateSchema), generate);
router.get('/', list);
router.get('/:id', get);
router.get('/:id/summary', summary);
router.patch('/tasks/:taskId/complete', complete);
router.patch('/tasks/:taskId/skip', skip);
router.patch('/tasks/:taskId/reschedule', validateRequest(taskRescheduleSchema), reschedule);

export default router;
