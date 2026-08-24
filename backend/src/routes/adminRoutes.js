import express from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import { adminOverview, listStudents, fetchStudent, setStudentStatus } from '../controllers/adminController.js';
import { validateRequest, updateStudentStatusSchema } from '../utils/validators.js';

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/overview', adminOverview);
router.get('/students', listStudents);
router.get('/students/:studentId', fetchStudent);
router.patch('/students/:studentId/status', validateRequest(updateStudentStatusSchema), setStudentStatus);
router.get('/analytics', adminOverview);

export default router;
