const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { publicUser } = require('../middleware/auth');
const { badRequest } = require('../utils/errors');
const { ok } = require('../utils/response');
const { isStrongPassword } = require('../utils/validate');

async function updateProfile(req, res, next) {
  try {
    const { name, bio, institution, gradeLevel, avatarColor, preferences } = req.body || {};
    const data = {};
    if (name !== undefined) {
      const n = String(name).trim();
      if (n.length < 2 || n.length > 80) throw badRequest('Name must be between 2 and 80 characters');
      data.name = n;
    }
    if (bio !== undefined) data.bio = String(bio).slice(0, 500) || null;
    if (institution !== undefined) data.institution = String(institution).slice(0, 200) || null;
    if (gradeLevel !== undefined) data.gradeLevel = String(gradeLevel).slice(0, 100) || null;
    if (avatarColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(avatarColor))) data.avatarColor = String(avatarColor);
    if (preferences !== undefined && typeof preferences === 'object' && preferences !== null) {
      data.preferences = JSON.stringify(preferences).slice(0, 2000);
    }
    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    return ok(res, { user: publicUser(user) }, 'Profile updated');
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) throw badRequest('Current password and new password are required');
    if (!isStrongPassword(newPassword)) throw badRequest('New password must be 8-128 characters and include letters and numbers');

    const match = await bcrypt.compare(String(currentPassword), req.user.passwordHash);
    if (!match) throw badRequest('Current password is incorrect');

    const passwordHash = await bcrypt.hash(String(newPassword), 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
    return ok(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { updateProfile, changePassword };
