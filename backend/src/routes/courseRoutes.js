import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
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

router.get('/catalog', authenticate, getCatalog);
router.post('/initialize-catalog', initializeCatalog);
router.post('/courses/:courseId/enroll', authenticate, enrollInCourse);
router.get('/dashboard', authenticate, getDashboard);
router.get('/courses/:courseId', authenticate, getCourseDetails);
router.get('/courses/:courseId/progress', authenticate, getCourseProgress);
router.get('/courses/:courseId/lessons', authenticate, getLessonSequence);
router.post('/courses/:courseId/lessons/:lessonId/complete', authenticate, completeLesson);

export default router;
