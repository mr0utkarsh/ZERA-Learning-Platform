import express from 'express';
import { authenticate, requireAdmin, requireStudent } from '../middleware/authMiddleware.js';
import {
  initializeCatalog,
  getCatalog,
  enrollInCourse,
  getDashboard,
  getCourseDetails,
  getCourseProgress,
  completeLesson,
  getLessonSequence
} from '../controllers/courseController.js';

const router = express.Router();

router.get('/catalog', authenticate, requireStudent, getCatalog);
router.get('/dashboard', authenticate, requireStudent, getDashboard);

// Seeding writes to the database, so it must not be reachable anonymously.
router.post('/initialize-catalog', authenticate, requireAdmin, initializeCatalog);

router.post('/courses/:courseId/enroll', authenticate, requireStudent, enrollInCourse);
router.get('/courses/:courseId', authenticate, requireStudent, getCourseDetails);
router.get('/courses/:courseId/progress', authenticate, requireStudent, getCourseProgress);
router.get('/courses/:courseId/lessons', authenticate, requireStudent, getLessonSequence);
router.post('/courses/:courseId/lessons/:lessonId/complete', authenticate, requireStudent, completeLesson);

export default router;
