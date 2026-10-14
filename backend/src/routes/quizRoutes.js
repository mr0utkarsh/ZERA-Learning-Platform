import express from 'express';
import { authenticate, requireStudent } from '../middleware/authMiddleware.js';
import { create, list, get, submit, attempts } from '../controllers/quizController.js';
import { quizCreateSchema, quizSubmitSchema, validateRequest } from '../utils/validators.js';

const router = express.Router();
router.use(authenticate);
router.use(requireStudent);

router.get('/attempts', attempts);
router.post('/', validateRequest(quizCreateSchema), create);
router.get('/', list);
router.get('/:id', get);
router.post('/:id/attempts', validateRequest(quizSubmitSchema), submit);

export default router;
