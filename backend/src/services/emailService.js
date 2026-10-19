import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { brevoService } from './brevoService.js';

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
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }
  return transporter;
};

const NOT_CONFIGURED =
  'Email is not configured. Set EMAIL_PROVIDER=smtp, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS and EMAIL_FROM in the backend .env file.';

/** Escapes text that is interpolated into an HTML email body. */
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) =>
    ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": "'" }[char])
  );

async function sendViaBrevo({ to, subject, html, text }) {
  if (!brevoService.isConfigured()) {
    throw new Error('Brevo API is not configured. Set BREVO_API_KEY.');
  }
  const fromEmail = (env.EMAIL_FROM || 'noreply@zera.app').replace(/^.*<|>.*$/g, '').trim();
  const fromName = (env.EMAIL_FROM || 'ZERA').replace(/<.*$/, '').trim();
  return brevoService.sendEmail({
    to,
    subject,
    html,
    text
  });
}

async function sendWithFallback(smtpSend, brevoPayload) {
  try {
    const result = await smtpSend();
    return { ...result, provider: 'smtp' };
  } catch (smtpError) {
    console.warn('SMTP send failed, falling back to Brevo API:', smtpError.message);
    try {
      const result = await sendViaBrevo(brevoPayload);
      return { ...result, provider: 'brevo-api' };
    } catch (apiError) {
      const err = new Error(`Both SMTP and Brevo API failed. SMTP: ${smtpError.message}. API: ${apiError.message}`);
      err.statusCode = 502;
      throw err;
    }
  }
}

export const emailService = {
  isConfigured() {
    const provider = (env.EMAIL_PROVIDER || '').toLowerCase();
    // Allow SMTP
    if (provider === 'smtp') {
      return Boolean(
        env.EMAIL_HOST &&
        env.EMAIL_PORT &&
        env.EMAIL_USER &&
        env.EMAIL_PASS &&
        env.EMAIL_FROM
      );
    }
    // Allow Brevo API (brevo, api, or any provider if BREVO_API_KEY is set)
    if (brevoService.isConfigured()) {
      return true;
    }
    return false;
  },

  async sendPasswordResetEmail(email, userName, resetToken) {
    if (!this.isConfigured()) {
      throw new Error(NOT_CONFIGURED);
    }

    if (!email) throw new Error('A valid email address is required.');
    if (!resetToken) throw new Error('Password reset token is required.');

    const clientUrl = (env.CLIENT_URL || 'http://localhost:5500').replace(/\/$/, '');
    const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const text = `Hello ${userName || 'ZERA user'},\n\nWe received a request to reset your ZERA Learning Platform password.\n\nUse the link below to reset your password (expires in ${env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '1 hour'}):\n\n${resetUrl}\n\nIf you did not request a password reset, you can ignore this email.\n\nRegards,\nZERA Learning Platform`;

    const html = `
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
    `;

    return sendWithFallback(
      () => getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to: email,
        subject: 'ZERA Learning Platform \u2013 Password Reset',
        text,
        html
      }),
      { to: email, subject: 'ZERA Learning Platform \u2013 Password Reset', text, html }
    );
  },

  async sendOtpEmail(email, userName, otp) {
    if (!this.isConfigured()) {
      throw new Error(NOT_CONFIGURED);
    }

    if (!email) throw new Error('A valid email address is required.');
    if (!otp) throw new Error('OTP is required.');

    const text = `Hello ${userName || 'ZERA user'},\n\nYour one-time password (OTP) to reset your ZERA Learning Platform password is:\n\n${otp}\n\nThis OTP expires in 10 minutes and can only be used once.\n\nIf you did not request a password reset, you can safely ignore this email.\n\nRegards,\nZERA Learning Platform`;

    const html = `
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
    `;

    return sendWithFallback(
      () => getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to: email,
        subject: 'ZERA Learning Platform \u2013 Your Password Reset OTP',
        text,
        html
      }),
      { to: email, subject: 'ZERA Learning Platform \u2013 Your Password Reset OTP', text, html }
    );
  },

  async sendAdminInviteEmail(email, invitedName, invitedByEmail) {
    if (!this.isConfigured()) {
      throw new Error(NOT_CONFIGURED);
    }
    if (!email) throw new Error('A valid email address is required.');

    const clientUrl = (env.CLIENT_URL || 'http://localhost:5500').replace(/\/$/, '');

    const text = `Hello ${invitedName || 'there'},\n\n${invitedByEmail || 'An administrator'} has invited you to join the ZERA Learning Platform as an administrator.\n\nSign in as an existing administrator to review and approve this invitation at:\n\n${clientUrl}/admin-login\n\nYour account is not active until the invitation is approved.\n\nRegards,\nZERA Learning Platform`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>ZERA Learning Platform</h2>
        <p>Hello ${escapeHtml(invitedName || 'there')},</p>
        <p>${escapeHtml(invitedByEmail || 'An administrator')} has invited you to join as an administrator.</p>
        <p>
          <a href="${clientUrl}/admin-login" style="display:inline-block;padding:12px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
            Review invitation
          </a>
        </p>
        <p>Your account is not active until the invitation is approved.</p>
        <p>Regards,<br>ZERA Learning Platform</p>
      </div>
    `;

    return sendWithFallback(
      () => getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to: email,
        subject: 'ZERA Learning Platform \u2013 Administrator Invitation',
        text,
        html
      }),
      { to: email, subject: 'ZERA Learning Platform \u2013 Administrator Invitation', text, html }
    );
  }
};