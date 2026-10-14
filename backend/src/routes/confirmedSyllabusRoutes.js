import express from 'express';
import { authenticate, requireStudent } from '../middleware/authMiddleware.js';
import { confirm, list, get } from '../controllers/confirmedSyllabusController.js';
import { confirmSyllabusSchema, validateRequest } from '../utils/validators.js';

const router = express.Router();
router.use(authenticate);
router.use(requireStudent);

router.post('/confirm', validateRequest(confirmSyllabusSchema), confirm);
router.get('/', list);
router.get('/:id', get);

export default router;
