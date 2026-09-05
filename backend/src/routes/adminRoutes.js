const express = require('express');
const ctrl = require('../controllers/adminController');
const settingsCtrl = require('../controllers/adminSettingsController');
const manageCtrl = require('../controllers/adminManageController');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiters');

// Every admin route requires a valid session AND role ADMIN.
// Authorization is enforced here on the backend — frontend protection
// alone is never sufficient.
const router = express.Router();
router.use(apiLimiter, authenticate, requireAdmin);

// Settings (API configuration) — SUPER_ADMIN only.
// GET never returns full keys; PUT encrypts.
router.get('/settings', requireSuperAdmin, settingsCtrl.getSettings);
router.put('/settings', requireSuperAdmin, settingsCtrl.updateSettings);

// Admin Management — SUPER_ADMIN only: invite/approve/reject/revoke admins.
router.get('/admins', requireSuperAdmin, manageCtrl.listAdmins);
router.post('/admins/invite', requireSuperAdmin, manageCtrl.inviteAdmin);
router.post('/admins/:id/approve', requireSuperAdmin, manageCtrl.approveAdmin);
router.post('/admins/:id/reject', requireSuperAdmin, manageCtrl.rejectAdmin);
router.post('/admins/:id/revoke', requireSuperAdmin, manageCtrl.revokeAdmin);
router.post('/admins/:id/restore', requireSuperAdmin, manageCtrl.restoreAdmin);
router.delete('/admins/:id', requireSuperAdmin, manageCtrl.deleteAdmin);

router.get('/stats', ctrl.getStats);
router.get('/students', ctrl.listStudents);
router.get('/students/:id', ctrl.getStudent);
router.post('/students/:id/suspend', ctrl.suspendStudent);
router.post('/students/:id/restore', ctrl.restoreStudent);
router.delete('/students/:id', ctrl.deleteStudent);

module.exports = router;
