import express from 'express';
import { authenticate, requireStudent } from '../middleware/authMiddleware.js';
import { upload, correct, get, list } from '../controllers/handwritingController.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();
router.use(authenticate);
router.use(requireStudent);

const uploadRateKey = (req) => `user:${req.user?.id ?? req.ip ?? 'unknown'}`;
router.post('/', rateLimit({ windowMs: 60 * 60_000, max: 30, keyGenerator: uploadRateKey }), upload);
router.get('/', list);
router.get('/:id', get);
router.patch('/:id/correct', correct);

export default router;
