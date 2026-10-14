import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Built lazily so that importing this module never opens a connection attempt
// against an unconfigured or unreachable SMTP host.
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: Number(env.EMAIL_PORT || 587),
      secure: Number(env.EMAIL_PORT || 587) === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS
      }
    });
  }
  return transporter;
};

const NOT_CONFIGURED =
  'Email is not configured. Set EMAIL_PROVIDER=smtp, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS and EMAIL_FROM in the backend .env file.';

/** Escapes text that is interpolated into an HTML email body. */
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])
  );

export const emailService = {
  isConfigured() {
    const provider = (env.EMAIL_PROVIDER || '').toLowerCase();
    if (provider !== 'smtp') return false;
    return Boolean(
      env.EMAIL_HOST &&
      env.EMAIL_PORT &&
      env.EMAIL_USER &&
      env.EMAIL_PASS &&
      env.EMAIL_FROM
    );
  },

  async sendPasswordResetEmail(email, userName, resetToken) {
    if (!this.isConfigured()) {
      throw new Error(NOT_CONFIGURED);
    }

    if (!email) throw new Error('A valid email address is required.');
    if (!resetToken) throw new Error('Password reset token is required.');

    const clientUrl = (env.CLIENT_URL || 'http://localhost:5500').replace(/\/$/, '');
    const resetUrl = `${clientUrl}/reset-password.html?token=${encodeURIComponent(resetToken)}`;

    const info = await getTransporter().sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: 'ZERA Learning Platform – Password Reset',
      text: `Hello ${userName || 'ZERA user'},

We received a request to reset your ZERA Learning Platform password.

Use the link below to reset your password (expires in ${env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '1 hour'}):

${resetUrl}

If you did not request a password reset, you can ignore this email.

Regards,
ZERA Learning Platform`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2>ZERA Learning Platform</h2>
          <p>Hello ${userName || 'ZERA user'},</p>
          <p>We received a request to reset your ZERA Learning Platform password.</p>
          <p>
            <a
              href="${resetUrl}"
              style="
                display:inline-block;
                padding:12px 20px;
                background:#2563eb;
                color:white;
                text-decoration:none;
                border-radius:6px;
              "
            >
              Reset Password
            </a>
          </p>
          <p>This link expires in ${env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '1 hour'}.</p>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
          <p>Regards,<br>ZERA Learning Platform</p>
        </div>
      `
    });

    return { success: true, provider: env.EMAIL_PROVIDER, recipient: email, messageId: info.messageId };
  },

  async sendOtpEmail(email, userName, otp) {
    if (!this.isConfigured()) {
      throw new Error(NOT_CONFIGURED);
    }

    if (!email) throw new Error('A valid email address is required.');
    if (!otp) throw new Error('OTP is required.');

    const info = await getTransporter().sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: 'ZERA Learning Platform – Your Password Reset OTP',
      text: `Hello ${userName || 'ZERA user'},

Your one-time password (OTP) to reset your ZERA Learning Platform password is:

${otp}

This OTP expires in 10 minutes and can only be used once.

If you did not request a password reset, you can safely ignore this email.

Regards,
ZERA Learning Platform`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2>ZERA Learning Platform</h2>
          <p>Hello ${userName || 'ZERA user'},</p>
          <p>Your one-time password (OTP) to reset your ZERA Learning Platform password is:</p>
          <div style="margin:20px 0; padding:16px 24px; background:#f0f4ff; border-radius:8px; font-size:28px; font-weight:bold; letter-spacing:8px; text-align:center; color:#1e40af;">
            ${otp}
          </div>
          <p>This OTP expires in <strong>10 minutes</strong> and can only be used once.</p>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
          <p>Regards,<br>ZERA Learning Platform</p>
        </div>
      `
    });

    return { success: true, provider: env.EMAIL_PROVIDER, recipient: email, messageId: info.messageId };
  },

  async sendAdminInviteEmail(email, invitedName, invitedByEmail) {
    if (!this.isConfigured()) {
      throw new Error(NOT_CONFIGURED);
    }
    if (!email) throw new Error('A valid email address is required.');

    const clientUrl = (env.CLIENT_URL || 'http://localhost:5500').replace(/\/$/, '');

    const info = await getTransporter().sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: 'ZERA Learning Platform – Administrator Invitation',
      text: `Hello ${invitedName || 'there'},

${invitedByEmail || 'An administrator'} has invited you to join the ZERA Learning Platform as an administrator.

Sign in as an existing administrator to review and approve this invitation at:

${clientUrl}/admin-login.html

Your account is not active until the invitation is approved.

Regards,
ZERA Learning Platform`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2>ZERA Learning Platform</h2>
          <p>Hello ${escapeHtml(invitedName || 'there')},</p>
          <p>${escapeHtml(invitedByEmail || 'An administrator')} has invited you to join as an administrator.</p>
          <p>
            <a href="${clientUrl}/admin-login.html" style="display:inline-block;padding:12px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
              Review invitation
            </a>
          </p>
          <p>Your account is not active until the invitation is approved.</p>
          <p>Regards,<br>ZERA Learning Platform</p>
        </div>
      `
    });

    return { success: true, provider: env.EMAIL_PROVIDER, recipient: email, messageId: info.messageId };
  }
};