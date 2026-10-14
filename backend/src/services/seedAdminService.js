import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';

/**
 * Creates the first SUPER_ADMIN from configuration.
 *
 * This is the only way to bootstrap a platform owner, because every admin
 * endpoint requires an existing admin. It is idempotent: an existing account is
 * never modified, so a redeploy cannot silently change or escalate credentials.
 */
export const seedAdminFromEnv = async ({ email, password, name } = {}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const suppliedPassword = String(password || '');

  if (!normalizedEmail) throw new Error('SEED_ADMIN_EMAIL is required to seed an administrator.');
  if (suppliedPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return { created: false, user: existing };

  const passwordHash = await bcrypt.hash(suppliedPassword, 12);

  const user = await prisma.user.create({
    data: {
      name: String(name || 'Platform Owner').trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      profile: { create: {} }
    },
    select: { id: true, name: true, email: true, role: true, status: true }
  });

  return { created: true, user };
};
