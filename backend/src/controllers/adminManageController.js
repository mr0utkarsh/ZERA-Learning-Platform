/**
 * Admin Management — SUPER_ADMIN only.
 *
 * Lifecycle of ADMIN accounts:
 *   invite (INVITED) -> invitee accepts w/ code (PENDING) -> approve (ACTIVE)
 *   reject cancels an INVITED/PENDING account; revoke suspends an ACTIVE one.
 *
 * SUPER_ADMIN accounts are never targets of these actions (tier protection),
 * and no SUPER_ADMIN may act on their own account.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const config = require('../config');
const emailService = require('../services/emailService');
const { issueOtp, OtpPurpose } = require('../services/otpService');
const { isValidEmail, requireFields } = require('../utils/validate');
const { badRequest, forbidden, notFound, conflict } = require('../utils/errors');
const { ok, created } = require('../utils/response');
const { Role, AccountStatus } = require('../utils/enums');

const INVITE_TTL_MINUTES = 7 * 24 * 60; // invitations last 7 days

/** In dev without SMTP, expose the invite code in the response so flows stay testable. */
function maybeExposeInviteCode(payload, code) {
  if (!config.isProduction() && config.devShowOtp && !emailService.isEmailConfigured()) {
    payload.devInviteCode = code;
  }
}

async function logAdminAction(actor, message) {
  await prisma.activityLog.create({
    data: { userId: actor.id, type: 'ADMIN_MANAGEMENT', message },
  }).catch(() => {});
}

/** Load a target user that must be an ADMIN (never SUPER_ADMIN). */
async function getAdminTarget(req, allowedStatuses, action) {
  if (req.params.id === req.user.id) throw forbidden('You cannot perform this action on your own account');
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.role !== Role.ADMIN) throw notFound('Admin account not found');
  if (allowedStatuses && !allowedStatuses.includes(user.status)) {
    throw badRequest(`Cannot ${action} an admin account in status ${user.status}`);
  }
  return user;
}

/** GET /api/admin/admins — the admin roster: real accounts only. */
async function listAdmins(req, res, next) {
  try {
    const admins = await prisma.user.findMany({
      where: { OR: [{ role: Role.ADMIN }, { role: Role.SUPER_ADMIN }] },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, emailVerified: true },
    });
    return ok(res, { admins });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/admins/invite — create (or re-issue) an invitation. */
async function inviteAdmin(req, res, next) {
  try {
    requireFields(req.body, ['name', 'email']);
    const name = String(req.body.name).trim();
    const email = String(req.body.email).trim().toLowerCase();

    if (name.length < 2 || name.length > 80) throw badRequest('Name must be between 2 and 80 characters');
    if (!isValidEmail(email)) throw badRequest('Please enter a valid email address');

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && !(existing.role === Role.ADMIN && existing.status === AccountStatus.INVITED)) {
      throw conflict('An account with this email already exists');
    }

    let user = existing;
    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          // Unusable random hash until the invitee sets their own password.
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
          role: Role.ADMIN,
          status: AccountStatus.INVITED,
          emailVerified: false,
        },
      });
    }

    const { code } = await issueOtp({ userId: user.id, purpose: OtpPurpose.ADMIN_INVITE, ttlMinutes: INVITE_TTL_MINUTES });

    if (emailService.isEmailConfigured()) {
      try {
        await emailService.sendOtpEmail({ to: email, name, purpose: OtpPurpose.ADMIN_INVITE, code, ttlText: '7 days' });
      } catch (err) {
        console.error('[admin] failed to send invitation email:', err.message);
      }
    }

    await logAdminAction(req.user, `Admin invitation sent to ${email}`);

    const payload = {
      admin: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
      emailSent: emailService.isEmailConfigured(),
    };
    maybeExposeInviteCode(payload, code);
    return created(res, payload, existing ? 'Invitation re-sent' : 'Invitation sent');
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/admins/:id/approve — PENDING -> ACTIVE. */
async function approveAdmin(req, res, next) {
  try {
    const user = await getAdminTarget(req, [AccountStatus.PENDING], 'approve');
    const updated = await prisma.user.update({ where: { id: user.id }, data: { status: AccountStatus.ACTIVE } });
    await logAdminAction(req.user, `Admin account approved for ${user.email}`);
    return ok(res, { admin: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, status: updated.status } }, 'Admin approved');
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/admins/:id/reject — cancel an INVITED/PENDING account. */
async function rejectAdmin(req, res, next) {
  try {
    const user = await getAdminTarget(req, [AccountStatus.INVITED, AccountStatus.PENDING], 'reject');
    await prisma.user.delete({ where: { id: user.id } }); // cascades OTPs + any partial data
    await logAdminAction(req.user, `Admin invitation rejected for ${user.email}`);
    return ok(res, null, 'Admin invitation rejected');
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/admins/:id/revoke — ACTIVE -> SUSPENDED. */
async function revokeAdmin(req, res, next) {
  try {
    const user = await getAdminTarget(req, [AccountStatus.ACTIVE], 'revoke');
    const updated = await prisma.user.update({ where: { id: user.id }, data: { status: AccountStatus.SUSPENDED } });
    await logAdminAction(req.user, `Admin access revoked for ${user.email}`);
    return ok(res, { admin: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, status: updated.status } }, 'Admin access revoked');
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/admins/:id/restore — SUSPENDED -> ACTIVE. */
async function restoreAdmin(req, res, next) {
  try {
    const user = await getAdminTarget(req, [AccountStatus.SUSPENDED], 'restore');
    const updated = await prisma.user.update({ where: { id: user.id }, data: { status: AccountStatus.ACTIVE } });
    await logAdminAction(req.user, `Admin access restored for ${user.email}`);
    return ok(res, { admin: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, status: updated.status } }, 'Admin access restored');
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/admins/:id — permanent removal. */
async function deleteAdmin(req, res, next) {
  try {
    const user = await getAdminTarget(req, null, 'delete');
    await prisma.user.delete({ where: { id: user.id } });
    await logAdminAction(req.user, `Admin account deleted for ${user.email}`);
    return ok(res, null, 'Admin account deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = { listAdmins, inviteAdmin, approveAdmin, rejectAdmin, revokeAdmin, restoreAdmin, deleteAdmin };
