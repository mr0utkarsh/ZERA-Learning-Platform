import { env } from '../config/env.js';

/**
 * Brevo transactional email / SMS (Section 8).
 *
 * Email in this project is already delivered through Brevo's SMTP relay
 * (see emailService.js / EMAIL_HOST=smtp-relay.brevo.com). This client adds the
 * Brevo HTTP API for SMS and as an alternative email path.
 *
 * Honesty rules enforced here:
 *  - A send is reported as delivered ONLY when the provider returns success.
 *  - SMS requires an approved sender, a supported recipient, and credits; when
 *    any of those is missing the provider's own error is surfaced verbatim
 *    rather than claiming delivery.
 */
const BREVO_BASE = 'https://api.brevo.com';
const DEFAULT_SENDER_NAME = 'ZERA';
const DEFAULT_SENDER_EMAIL = 'no-reply@zera.app';

/** Trims an address and removes stray whitespace around the "@" separator. */
const normalizeEmail = (value) => String(value || '').trim().replace(/\s+@/g, '@');

export const brevoService = {
  isConfigured() {
    return Boolean(env.BREVO_API_KEY);
  },

  capabilities() {
    return {
      configured: this.isConfigured(),
      smsSenderConfigured: Boolean(env.BREVO_SMS_SENDER && env.BREVO_SMS_SENDER !== 'ZERA'),
      smsTestRecipient: env.BREVO_SMS_RECIPIENT || null,
      note: 'SMS delivery depends on an approved sender, destination support, and account credits.'
    };
  },

  async sendEmail({ to, subject, html, text, fromEmail, fromName, replyTo }) {
    if (!this.isConfigured()) {
      const err = new Error('Brevo is not configured. Set BREVO_API_KEY.');
      err.statusCode = 503;
      throw err;
    }
    if (!to) throw Object.assign(new Error('A recipient email is required.'), { statusCode: 400 });
    // Brevo only accepts a sender that is verified on the account, so the
    // configured EMAIL_FROM is used as-is instead of a hard-coded address.
    const senderEmail = normalizeEmail(fromEmail) || DEFAULT_SENDER_EMAIL;
    const senderName = String(fromName || '').trim() || DEFAULT_SENDER_NAME;
    const replyToEmail = normalizeEmail(replyTo) || senderEmail;
    const res = await fetch(`${BREVO_BASE}/v3/smtp/email`, {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        replyTo: { email: replyToEmail, name: senderName },
        to: [{ email: normalizeEmail(to) }],
        subject: subject || 'ZERA',
        htmlContent: html || `<p>${String(text || '').replace(/</g, '&lt;')}</p>`,
        textContent: text || ''
      })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.messageId) {
      const err = new Error(`Brevo email failed (${res.status}): ${body.message || 'unknown error'}`);
      err.statusCode = 502;
      throw err;
    }
    return { delivered: true, provider: 'brevo-email', messageId: body.messageId };
  },

  async sendSms({ recipient, content }) {
    if (!this.isConfigured()) {
      const err = new Error('Brevo is not configured. Set BREVO_API_KEY.');
      err.statusCode = 503;
      throw err;
    }
    if (!recipient) throw Object.assign(new Error('A recipient phone number is required.'), { statusCode: 400 });
    if (!content) throw Object.assign(new Error('SMS content is required.'), { statusCode: 400 });
    const res = await fetch(`${BREVO_BASE}/v3/transactionalSMS/sms`, {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        type: 'transactional',
        sender: env.BREVO_SMS_SENDER,
        recipient,
        content
      })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Surface the provider's exact blocker (sender not approved, no credits,
      // unsupported destination, etc.) instead of claiming delivery.
      const err = new Error(`Brevo SMS failed (${res.status}): ${body.message || body.code || 'unknown error'}`);
      err.statusCode = 502;
      throw err;
    }
    return { delivered: true, provider: 'brevo-sms', reference: body.reference || null, remainingCredits: body.remainingCredits ?? null };
  }
};
