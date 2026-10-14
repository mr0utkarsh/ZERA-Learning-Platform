import express from 'express';
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

export default router;
