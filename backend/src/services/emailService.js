import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { brevoService } from './brevoService.js';

const DEFAULT_SENDER_NAME = 'ZERA';
const DEFAULT_SENDER_EMAIL = 'no-reply@zera.app';

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

/**
 * Resolves the outgoing sender from EMAIL_FROM.
 *
 * EMAIL_FROM is either a bare address (`no-reply@zera.app`) or a display-name
 * form (`ZERA Live <no-reply@zera.app>`). Both the SMTP relay and the Brevo API
 * need the address and the display name separately, so the value is parsed
 * instead of being copied verbatim into the `from` header.
 */
export const resolveSender = (raw = env.EMAIL_FROM) => {
  const value = String(raw ?? '').trim().replace(/^["']|["']$/g, '').trim();
  const match = value.match(/^(.*?)\s*<\s*([^<>]+?)\s*>$/);

  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, '').trim();
    return {
      name: name || DEFAULT_SENDER_NAME,
      address: match[2].trim() || DEFAULT_SENDER_EMAIL
    };
  }

  return {
    name: DEFAULT_SENDER_NAME,
    address: value || DEFAULT_SENDER_EMAIL
  };
};

const smtpConfigured = () =>
  Boolean(env.EMAIL_HOST && env.EMAIL_PORT && env.EMAIL_USER && env.EMAIL_PASS && env.EMAIL_FROM);

const brevoConfigured = () => brevoService.isConfigured();

/**
 * The SMTP relay and the Brevo API are two routes to the same inbox.
 * EMAIL_PROVIDER decides which one is attempted first; the other stays
 * available as a fallback so a single failing path cannot drop every mail.
 */
const useSmtpFirst = () => {
  const provider = (env.EMAIL_PROVIDER || '').toLowerCase();
  if (provider === 'brevo' || provider === 'api') return false;
  return smtpConfigured();
};

async function sendViaBrevo({ to, subject, html, text, fromEmail, fromName, replyTo }) {
  if (!brevoConfigured()) {
    throw new Error('Brevo API is not configured. Set BREVO_API_KEY.');
  }
  return brevoService.sendEmail({
    to,
    subject,
    html,
    text,
    fromEmail,
    fromName,
    replyTo
  });
}

/**
 * Sends through the configured transports in order and reports the provider
 * that actually delivered the message. When every transport fails, the exact
 * provider errors are surfaced instead of a generic failure.
 */
async function deliver({ to, subject, text, html }) {
  const sender = resolveSender();
  const from = { name: sender.name, address: sender.address };

  const smtpSend = smtpConfigured()
    ? () => getTransporter().sendMail({
        from,
        replyTo: sender.address,
        to,
        subject,
        text,
        html
      })
    : null;

  const brevoSend = brevoConfigured()
    ? () => sendViaBrevo({
        to,
        subject,
        html,
        text,
        fromEmail: sender.address,
        fromName: sender.name,
        replyTo: sender.address
      })
    : null;

  const transports = useSmtpFirst()
    ? [{ provider: 'smtp', send: smtpSend }, { provider: 'brevo-api', send: brevoSend }]
    : [{ provider: 'brevo-api', send: brevoSend }, { provider: 'smtp', send: smtpSend }];

  const failures = [];

  for (const transport of transports) {
    if (!transport.send) continue;
    try {
      const result = await transport.send();
      return { ...result, provider: transport.provider };
    } catch (error) {
      failures.push(`${transport.provider}: ${error.message}`);
      console.warn(`[email] ${transport.provider} send failed:`, error.message);
    }
  }

  if (failures.length === 0) {
    const err = new Error(NOT_CONFIGURED);
    err.statusCode = 503;
    throw err;
  }

  const err = new Error(`Email delivery failed. ${failures.join(' | ')}`);
  err.statusCode = 502;
  throw err;
}

export const emailService = {
  isConfigured() {
    const provider = (env.EMAIL_PROVIDER || '').toLowerCase();
    if (provider === 'smtp') return smtpConfigured();
    if (provider === 'brevo' || provider === 'api') return brevoConfigured();
    return smtpConfigured() || brevoConfigured();
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

    return deliver({
      to: email,
      subject: 'ZERA Learning Platform \u2013 Password Reset',
      text,
      html
    });
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

    return deliver({
      to: email,
      subject: 'ZERA Learning Platform \u2013 Your Password Reset OTP',
      text,
      html
    });
  },

  async sendAdminInviteEmail(email, invitedName, invitedByEmail) {
    if (!this.isConfigured()) {
      throw new Error(NOT_CONFIGURED);
    }

    if (!email) throw new Error('A valid email address is required.');

    const clientUrl = (env.CLIENT_URL || 'http://localhost:5500').replace(/\/$/, '');

    const text = `Hello ${invitedName || 'there'},\n\n${invitedByEmail || 'An administrator'} has invited you to join the ZERA Learning Platform as an administrator.\n\nSign in as an existing administrator to review and approve this invitation at:\n\n${clientUrl}/admin-login.html\n\nYour account is not active until the invitation is approved.\n\nRegards,\nZERA Learning Platform`;

    const html = `
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
    `;

    return deliver({
      to: email,
      subject: 'ZERA Learning Platform \u2013 Administrator Invitation',
      text,
      html
    });
  }
};
