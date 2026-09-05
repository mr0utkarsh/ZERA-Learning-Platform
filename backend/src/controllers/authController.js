const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const config = require('../config');
const { signToken, setAuthCookie, clearAuthCookie, publicUser } = require('../middleware/auth');
const { issueOtp, verifyOtp, assertResendCooldown, OtpPurpose } = require('../services/otpService');
const emailService = require('../services/emailService');
const { isValidEmail, isStrongPassword, requireFields } = require('../utils/validate');
const { badRequest, unauthorized, notFound } = require('../utils/errors');
const { ok, created } = require('../utils/response');
const { Role, AccountStatus } = require('../utils/enums');

/** In dev without SMTP, expose the OTP in the response so flows stay testable. */
function maybeExposeOtp(payload, code) {
  if (!config.isProduction() && config.devShowOtp && !emailService.isEmailConfigured()) {
    payload.devOtp = code;
  }
}

async function signup(req, res, next) {
  try {
    requireFields(req.body, ['name', 'email', 'password']);
    const name = String(req.body.name).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);
    const confirmPassword = req.body.confirmPassword !== undefined ? String(req.body.confirmPassword) : password;

    if (name.length < 2 || name.length > 80) throw badRequest('Name must be between 2 and 80 characters');
    if (!isValidEmail(email)) throw badRequest('Please enter a valid email address');
    if (!isStrongPassword(password)) throw badRequest('Password must be 8-128 characters and include letters and numbers');
    if (password !== confirmPassword) throw badRequest('Passwords do not match');

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw badRequest('An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: Role.STUDENT, status: AccountStatus.ACTIVE },
    });

    // Email verification OTP
    const { code } = await issueOtp({ userId: user.id, purpose: OtpPurpose.EMAIL_VERIFICATION });
    try {
      await emailService.sendOtpEmail({ to: email, name, purpose: OtpPurpose.EMAIL_VERIFICATION, code });
    } catch (err) {
      console.error('[auth] failed to send verification email:', err.message);
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    const payload = { user: publicUser(user), emailVerificationRequired: true };
    maybeExposeOtp(payload, code);
    return created(res, payload, 'Account created. Please verify your email with the code we sent you.');
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    requireFields(req.body, ['email', 'password']);
    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw unauthorized('Invalid email or password');
    if (user.status === AccountStatus.SUSPENDED) throw unauthorized('This account has been suspended');
    if (user.status === AccountStatus.INVITED) throw unauthorized('This invitation has not been accepted yet');
    if (user.status === AccountStatus.PENDING) throw unauthorized('This account is awaiting approval');
    if (user.status !== AccountStatus.ACTIVE) throw unauthorized('This account is not active');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw unauthorized('Invalid email or password');

    const token = signToken(user);
    setAuthCookie(res, token);
    return ok(res, { user: publicUser(user) }, 'Logged in successfully');
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  clearAuthCookie(res);
  return ok(res, null, 'Logged out');
}

async function me(req, res) {
  return ok(res, { user: publicUser(req.user) });
}

async function verifyEmailOtp(req, res, next) {
  try {
    requireFields(req.body, ['code']);
    await verifyOtp({ userId: req.user.id, purpose: OtpPurpose.EMAIL_VERIFICATION, code: String(req.body.code).trim() });
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { emailVerified: true } });
    req.user = user;
    return ok(res, { user: publicUser(user) }, 'Email verified successfully');
  } catch (err) {
    next(err);
  }
}

async function resendEmailOtp(req, res, next) {
  try {
    if (req.user.emailVerified) return ok(res, null, 'Email is already verified');
    await assertResendCooldown(req.user.id, OtpPurpose.EMAIL_VERIFICATION);
    const { code } = await issueOtp({ userId: req.user.id, purpose: OtpPurpose.EMAIL_VERIFICATION });
    await emailService.sendOtpEmail({ to: req.user.email, name: req.user.name, purpose: OtpPurpose.EMAIL_VERIFICATION, code }).catch((e) =>
      console.error('[auth] email send failed:', e.message));
    const payload = {};
    maybeExposeOtp(payload, code);
    return ok(res, payload, 'A new verification code has been sent');
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    requireFields(req.body, ['email']);
    const email = String(req.body.email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // Always answer with the same message to avoid account enumeration,
    // but only actually send when the account exists.
    if (!user) return ok(res, null, 'If an account exists for that email, a reset code has been sent.');

    await assertResendCooldown(user.id, OtpPurpose.PASSWORD_RESET);
    const { code } = await issueOtp({ userId: user.id, purpose: OtpPurpose.PASSWORD_RESET });
    await emailService.sendOtpEmail({ to: email, name: user.name, purpose: OtpPurpose.PASSWORD_RESET, code }).catch((e) =>
      console.error('[auth] email send failed:', e.message));

    const payload = {};
    maybeExposeOtp(payload, code);
    return ok(res, payload, 'If an account exists for that email, a reset code has been sent.');
  } catch (err) {
    next(err);
  }
}

async function verifyResetOtp(req, res, next) {
  try {
    requireFields(req.body, ['email', 'code']);
    const email = String(req.body.email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw notFound('No account found for that email');
    // Validate without consuming — the reset step consumes the code.
    await verifyOtp({ userId: user.id, purpose: OtpPurpose.PASSWORD_RESET, code: String(req.body.code).trim(), consume: false });
    return ok(res, null, 'Code verified. You can now set a new password.');
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    requireFields(req.body, ['email', 'code', 'password']);
    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);
    const confirmPassword = req.body.confirmPassword !== undefined ? String(req.body.confirmPassword) : password;

    if (!isStrongPassword(password)) throw badRequest('Password must be 8-128 characters and include letters and numbers');
    if (password !== confirmPassword) throw badRequest('Passwords do not match');

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw notFound('No account found for that email');

    await verifyOtp({ userId: user.id, purpose: OtpPurpose.PASSWORD_RESET, code: String(req.body.code).trim() });
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return ok(res, null, 'Password reset successfully. You can now log in with your new password.');
  } catch (err) {
    next(err);
  }
}

/**
 * Accept an admin invitation: the invitee proves they hold the invite code,
 * chooses their password, and lands in PENDING status until a SUPER_ADMIN
 * approves the account. (Public route, rate-limited like other auth flows.)
 */
async function acceptAdminInvite(req, res, next) {
  try {
    requireFields(req.body, ['email', 'code', 'password']);
    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);
    const confirmPassword = req.body.confirmPassword !== undefined ? String(req.body.confirmPassword) : password;

    if (!isStrongPassword(password)) throw badRequest('Password must be 8-128 characters and include letters and numbers');
    if (password !== confirmPassword) throw badRequest('Passwords do not match');

    const user = await prisma.user.findUnique({ where: { email } });
    // Same shape as a bad-code error so we don't reveal whether an invite exists.
    if (!user || user.role !== Role.ADMIN || user.status !== AccountStatus.INVITED) {
      throw badRequest('No active invitation found for this email. Ask the administrator to re-send it.');
    }

    await verifyOtp({ userId: user.id, purpose: OtpPurpose.ADMIN_INVITE, code: String(req.body.code).trim(), consume: true });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        emailVerified: true,
        status: AccountStatus.PENDING,
      },
    });
    return ok(res, { status: AccountStatus.PENDING }, 'Invitation accepted. Your admin account is awaiting approval.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup, login, logout, me,
  verifyEmailOtp, resendEmailOtp,
  forgotPassword, verifyResetOtp, resetPassword,
  acceptAdminInvite,
};
