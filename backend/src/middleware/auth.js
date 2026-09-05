const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');
const { unauthorized, forbidden } = require('../utils/errors');
const { Role, AccountStatus } = require('../utils/enums');

const COOKIE_NAME = 'zera_token';

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.isProduction(),
    sameSite: config.isProduction() ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: config.isProduction(),
    sameSite: config.isProduction() ? 'none' : 'lax',
    path: '/',
  });
}

async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) throw unauthorized('Please log in to continue');
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw unauthorized('Session expired, please log in again');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw unauthorized('Account no longer exists');
    if (user.status === AccountStatus.SUSPENDED) throw forbidden('Your account has been suspended');
    if (user.status !== AccountStatus.ACTIVE) throw forbidden('This account is not active yet');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden('Admin access required'));
    next();
  };
}

const requireAdmin = requireRole(Role.ADMIN, Role.SUPER_ADMIN);
const requireSuperAdmin = requireRole(Role.SUPER_ADMIN);
const requireStudent = requireRole(Role.STUDENT);

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  bio: user.bio,
  avatarColor: user.avatarColor,
  institution: user.institution,
  gradeLevel: user.gradeLevel,
  emailVerified: user.emailVerified,
  preferences: JSON.parse(user.preferences || '{}'),
  createdAt: user.createdAt,
});

module.exports = { COOKIE_NAME, signToken, setAuthCookie, clearAuthCookie, authenticate, requireAdmin, requireSuperAdmin, requireStudent, publicUser };
