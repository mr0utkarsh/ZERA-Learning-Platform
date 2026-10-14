import express from 'express';
import { authenticate, requireStudent } from '../middleware/authMiddleware.js';
import { index } from '../controllers/performanceController.js';

const router = express.Router();
router.use(authenticate);
router.use(requireStudent);

router.get('/', index);

export default router;
