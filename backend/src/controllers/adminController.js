import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { aiStatus } from '../services/aiService.js';
import { emailService } from '../services/emailService.js';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const badRequest = (res, message) => res.status(400).json({ success: false, message });

/**
 * Guards operations that change another account's privileges or lifecycle.
 *
 * Platform-owner operations (granting or removing SUPER_ADMIN, editing or
 * deleting a super admin) are restricted to SUPER_ADMIN, so a regular admin can
 * never escalate itself or a peer.
 */
const assertMayManage = async (actor, targetId) => {
  if (targetId === actor.id) {
    return 'You cannot perform this action on your own account.';
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true }
  });

  if (!target) return 'The target user no longer exists.';
  if (target.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
    return 'Only a super administrator can modify a super administrator account.';
  }

  return null;
};

// ─── List Users ───────────────────────────────────────────────────────────────
export const getUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const where = {};

    if (role) {
      const normalized = String(role).toUpperCase();
      if (!['STUDENT', 'ADMIN', 'SUPER_ADMIN'].includes(normalized)) {
        return badRequest(res, 'Role must be STUDENT, ADMIN or SUPER_ADMIN.');
      }
      where.role = normalized;
    }
    if (status) where.status = String(status).toUpperCase();
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            enrollments: true,
            notes: true,
            quizAttempts: true,
            syllabusUploads: true
          }
        }
      }
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// ─── Suspend User ─────────────────────────────────────────────────────────────
export const suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const refusal = await assertMayManage(req.user, id);
    if (refusal) return badRequest(res, refusal);

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED', tokenVersion: { increment: 1 } },
      select: { id: true, name: true, email: true, status: true, role: true }
    });

    res.json({
      success: true,
      data: user,
      message: `User ${user.email} has been suspended and their sessions were revoked.`
    });
  } catch (error) {
    next(error);
  }
};

// ─── Restore User ─────────────────────────────────────────────────────────────
export const restoreUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const refusal = await assertMayManage(req.user, id);
    if (refusal) return badRequest(res, refusal);

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: { id: true, name: true, email: true, status: true, role: true }
    });

    res.json({ success: true, data: user, message: `User ${user.email} has been restored to active status.` });
  } catch (error) {
    next(error);
  }
};

// ─── Delete User ──────────────────────────────────────────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const refusal = await assertMayManage(req.user, id);
    if (refusal) return badRequest(res, refusal);

    await prisma.user.delete({ where: { id } });

    res.json({ success: true, data: { id }, message: 'User deleted permanently.' });
  } catch (error) {
    next(error);
  }
};

// ─── Update User Role ─────────────────────────────────────────────────────────
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestedRole = String(req.body.role || '').toUpperCase();

    if (!['STUDENT', 'ADMIN', 'SUPER_ADMIN'].includes(requestedRole)) {
      return badRequest(res, 'Role must be STUDENT, ADMIN or SUPER_ADMIN.');
    }

    // Only a super admin may hand out or revoke the super admin role.
    if (requestedRole === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only a super administrator can grant the SUPER_ADMIN role.'
      });
    }

    const refusal = await assertMayManage(req.user, id);
    if (refusal) return badRequest(res, refusal);

    const user = await prisma.user.update({
      where: { id },
      data: { role: requestedRole, tokenVersion: { increment: 1 } },
      select: { id: true, name: true, email: true, role: true, status: true }
    });

    res.json({
      success: true,
      data: user,
      message: `User role updated to ${user.role}. Their sessions were revoked.`
    });
  } catch (error) {
    next(error);
  }
};

// ─── Invite Admin (requires approval) ─────────────────────────────────────────
export const inviteAdmin = async (req, res, next) => {
  try {
    const { name, email, role } = req.body;

    if (!name || !email) {
      return badRequest(res, 'Name and email are required.');
    }

    const requestedRole = String(role || 'ADMIN').toUpperCase();
    if (!ADMIN_ROLES.includes(requestedRole)) {
      return badRequest(res, 'Invited role must be ADMIN or SUPER_ADMIN.');
    }
    if (requestedRole === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only a super administrator can invite another super administrator.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const pending = await prisma.adminInvite.findFirst({
      where: { email: normalizedEmail, status: 'PENDING' }
    });
    if (pending) {
      return res.status(409).json({ success: false, message: 'A pending invite already exists for this email.' });
    }

    // The invited person chooses their own password when they accept, so no
    // password is ever transmitted or stored at invite time.
    const invite = await prisma.adminInvite.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        role: requestedRole,
        status: 'PENDING',
        invitedById: req.user.id
      },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
    });

    let notified = true;
    try {
      await emailService.sendAdminInviteEmail(normalizedEmail, String(name).trim(), req.user.email);
    } catch {
      notified = false;
    }

    res.status(201).json({
      success: true,
      data: { ...invite, emailSent: notified },
      message: notified
        ? `Invitation created for ${normalizedEmail}. The account is not active until it is approved.`
        : `Invitation created for ${normalizedEmail}, but the notification email could not be sent. Share the invite link manually.`
    });
  } catch (error) {
    next(error);
  }
};

// ─── List Invites ─────────────────────────────────────────────────────────────
export const listInvites = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status: String(status).toUpperCase() } : {};

    const invites = await prisma.adminInvite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        decidedAt: true,
        createdAt: true,
        invitedBy: { select: { id: true, name: true, email: true } },
        decidedBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ success: true, data: invites });
  } catch (error) {
    next(error);
  }
};

// ─── List Decided Invites (platform owner audit trail) ─────────────────────────
export const listDecidedInvites = async (req, res, next) => {
  try {
    const invites = await prisma.adminInvite.findMany({
      where: { status: { in: ['APPROVED', 'REVOKED'] } },
      orderBy: { decidedAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        decidedAt: true,
        createdAt: true,
        invitedBy: { select: { id: true, name: true, email: true } },
        decidedBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ success: true, data: invites });
  } catch (error) {
    next(error);
  }
};

// ─── Approve Invite ───────────────────────────────────────────────────────────
export const approveInvite = async (req, res, next) => {
  try {
    const { inviteId } = req.params;
    const { name, password } = req.body;

    if (!password || String(password).length < 8) {
      return badRequest(res, 'A password of at least 8 characters is required to activate the account.');
    }

    const invite = await prisma.adminInvite.findUnique({ where: { id: inviteId } });
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found.' });
    }
    if (invite.status !== 'PENDING') {
      return badRequest(res, `This invite is already ${invite.status.toLowerCase()}.`);
    }

    const existing = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    // Creating the account and closing the invite must be atomic, otherwise a
    // crash could leave an approved invite that never produced an account.
    const admin = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: String(name || invite.name).trim(),
          email: invite.email,
          passwordHash,
          role: invite.role,
          status: 'ACTIVE',
          profile: { create: {} }
        },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
      });

      await tx.adminInvite.update({
        where: { id: inviteId },
        data: { status: 'APPROVED', decidedById: req.user.id, decidedAt: new Date() }
      });

      return created;
    });

    res.json({ success: true, data: admin, message: `Admin account activated for ${admin.email}.` });
  } catch (error) {
    next(error);
  }
};

// ─── Revoke Invite ────────────────────────────────────────────────────────────
export const revokeInvite = async (req, res, next) => {
  try {
    const { inviteId } = req.params;

    const invite = await prisma.adminInvite.findUnique({ where: { id: inviteId } });
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found.' });
    }
    if (invite.status !== 'PENDING') {
      return badRequest(res, `Only pending invites can be revoked (this one is ${invite.status.toLowerCase()}).`);
    }

    const updated = await prisma.adminInvite.update({
      where: { id: inviteId },
      data: { status: 'REVOKED', decidedById: req.user.id, decidedAt: new Date() },
      select: { id: true, email: true, status: true, decidedAt: true }
    });

    res.json({ success: true, data: updated, message: `Invite for ${updated.email} was revoked.` });
  } catch (error) {
    next(error);
  }
};

// ─── Platform Stats ───────────────────────────────────────────────────────────
export const getPlatformStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalStudents,
      activeStudents,
      suspendedStudents,
      totalAdmins,
      totalSuperAdmins,
      suspendedUsers,
      totalCourses,
      totalEnrollments,
      totalQuizzes,
      totalQuizAttempts,
      totalSyllabusUploads,
      pendingInvites,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: 'SUSPENDED' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.quiz.count(),
      prisma.quizAttempt.count(),
      prisma.syllabusUpload.count(),
      prisma.adminInvite.count({ where: { status: 'PENDING' } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        counts: {
          totalUsers,
          totalStudents,
          activeStudents,
          suspendedStudents,
          totalAdmins,
          totalSuperAdmins,
          suspendedUsers,
          activeUsers: totalUsers - suspendedUsers,
          totalCourses,
          totalEnrollments,
          totalQuizzes,
          totalQuizAttempts,
          totalSyllabusUploads,
          pendingInvites
        },
        recentUsers,
        ai: aiStatus()
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── AI Config ────────────────────────────────────────────────────────────────
export const getAiConfig = async (req, res, next) => {
  try {
    res.json({ success: true, data: aiStatus() });
  } catch (error) {
    next(error);
  }
};
