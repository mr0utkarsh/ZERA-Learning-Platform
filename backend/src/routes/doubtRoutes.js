import express from 'express';
import { authenticate, requireStudent } from '../middleware/authMiddleware.js';
import { list, get, ask, saveNote } from '../controllers/doubtController.js';
import { doubtAskSchema, validateRequest } from '../utils/validators.js';

const router = express.Router();
router.use(authenticate);
router.use(requireStudent);

router.get('/', list);
router.post('/', validateRequest(doubtAskSchema), ask);
router.get('/:id', get);
router.post('/:messageId/save-note', saveNote);

export default router;
