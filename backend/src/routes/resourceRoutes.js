import express from 'express';
import { authenticate, requireStudent, requireAdmin } from '../middleware/authMiddleware.js';
import {
  list, get, recommend, bookmark, bookmarks, create, verify
} from '../controllers/resourceController.js';
import { resourceCreateSchema, validateRequest } from '../utils/validators.js';

const router = express.Router();

// Student-facing endpoints require an authenticated student.
router.get('/recommended', authenticate, requireStudent, recommend);
router.get('/bookmarks/mine', authenticate, requireStudent, bookmarks);
router.post('/:id/bookmark', authenticate, requireStudent, bookmark);
router.get('/', authenticate, requireStudent, list);
router.get('/:id', authenticate, requireStudent, get);

// Admin management.
router.post('/', authenticate, requireAdmin, validateRequest(resourceCreateSchema), create);
router.patch('/:id/verify', authenticate, requireAdmin, verify);

export default router;
