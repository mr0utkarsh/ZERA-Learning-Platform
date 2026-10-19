import express from 'express';
<<<<<<< HEAD
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/authMiddleware.js';
import {
  getUsers,
  suspendUser,
  restoreUser,
  deleteUser,
  updateUserRole,
  inviteAdmin,
  listInvites,
  listDecidedInvites,
  approveInvite,
  revokeInvite,
  getPlatformStats,
  getAiConfig
} from '../controllers/adminController.js';

const router = express.Router();

// Enforce both authentication and admin authorization for all /api/admin routes
router.use(authenticate);
router.use(requireAdmin);

// Dashboard stats
router.get('/stats', getPlatformStats);

// User management
router.get('/users', getUsers);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/restore', restoreUser);
router.delete('/users/:id', deleteUser);

// Role changes are admin-permitted, but the controller refuses to grant or
// revoke SUPER_ADMIN unless the caller is itself a super admin.
router.patch('/users/:id/role', updateUserRole);

// Admin invitation requires an explicit approval before the account exists.
router.get('/invites', listInvites);
router.post('/invites', inviteAdmin);
router.post('/invites/:inviteId/approve', approveInvite);
router.post('/invites/:inviteId/revoke', revokeInvite);

// Platform-owner only: the decided-invite history, i.e. who activated or
// revoked which privileged account.
router.get('/invites/decided', requireSuperAdmin, listDecidedInvites);

// AI configuration monitoring
router.get('/ai-config', getAiConfig);
=======
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
>>>>>>> 4804780593c11e68ae22b39c559dc624c40d29a7

export default router;
