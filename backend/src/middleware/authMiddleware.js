import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { sanitizeUser } from '../services/authService.js';

/** Roles allowed through requireAdmin. */
const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

/** Roles allowed through requireStudent. Admins also carry the student surface. */
const STUDENT_ROLES = new Set(['STUDENT', 'ADMIN', 'SUPER_ADMIN']);

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is required.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { profile: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.'
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended.'
      });
    }

    // Bumping tokenVersion (password change, password reset, forced sign-out)
    // instantly invalidates every JWT that was issued before the bump.
    const tokenVersion = typeof decoded.ver === 'number' ? decoded.ver : 0;
    if (tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Session is no longer valid. Please sign in again.'
      });
    }

    req.user = sanitizeUser(user);
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }
};

const deny = (res, label) => res.status(403).json({
  success: false,
  message: `${label} access is required.`
});

export const requireAdmin = (req, res, next) =>
  (req.user && ADMIN_ROLES.has(req.user.role) ? next() : deny(res, 'Administrator'));

export const requireSuperAdmin = (req, res, next) =>
  (req.user?.role === 'SUPER_ADMIN' ? next() : deny(res, 'Super administrator'));

export const requireStudent = (req, res, next) =>
  (req.user && STUDENT_ROLES.has(req.user.role) ? next() : deny(res, 'Student'));
