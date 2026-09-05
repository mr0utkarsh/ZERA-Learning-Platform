/**
 * OTP service — generation, hashing, verification.
 * - Codes are stored hashed (bcrypt), never in plain text.
 * - Codes expire after config.otp.ttlMinutes.
 * - Verification attempts are capped to prevent brute force.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const config = require('../config');
const { OtpPurpose } = require('../utils/enums');
const { badRequest } = require('../utils/errors');

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function issueOtp({ userId, purpose, ttlMinutes }) {
  // Invalidate previous unused codes for this purpose
  await prisma.otp.updateMany({
    where: { userId, purpose, used: false },
    data: { used: true },
  });

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const ttl = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : config.otp.ttlMinutes;
  const otp = await prisma.otp.create({
    data: {
      userId,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + ttl * 60 * 1000),
    },
  });
  return { id: otp.id, code };
}

/**
 * Verify a code. With consume=false the code stays valid afterwards —
 * used by the "verify OTP" step of password reset, so the same code can
 * still be consumed by the actual reset step. Attempts are always counted.
 */
async function verifyOtp({ userId, purpose, code, consume = true }) {
  const otp = await prisma.otp.findFirst({
    where: { userId, purpose, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) throw badRequest('No active code found. Request a new one.');
  if (otp.expiresAt < new Date()) throw badRequest('This code has expired. Request a new one.');
  if (otp.attempts >= config.otp.maxAttempts) {
    await prisma.otp.update({ where: { id: otp.id }, data: { used: true } });
    throw badRequest('Too many incorrect attempts. Request a new code.');
  }

  const match = await bcrypt.compare(String(code || ''), otp.codeHash);
  if (!match) {
    await prisma.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    const remaining = config.otp.maxAttempts - otp.attempts - 1;
    throw badRequest(`Incorrect code. ${Math.max(remaining, 0)} attempts remaining.`);
  }

  if (consume) await prisma.otp.update({ where: { id: otp.id }, data: { used: true } });
  return true;
}

/** Enforce a resend cooldown so users can't be OTP-spammed. */
async function assertResendCooldown(userId, purpose) {
  const last = await prisma.otp.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: 'desc' },
  });
  if (last && Date.now() - last.createdAt.getTime() < config.otp.resendCooldownSec * 1000) {
    throw badRequest(`Please wait ${config.otp.resendCooldownSec} seconds before requesting another code.`);
  }
}

module.exports = { issueOtp, verifyOtp, assertResendCooldown, OtpPurpose };
