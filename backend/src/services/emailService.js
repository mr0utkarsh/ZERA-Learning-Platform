/**
 * Email service (Nodemailer / SMTP).
 * Credentials come from environment variables only.
 * When SMTP is not configured, sending is skipped gracefully — in
 * development the API surfaces OTP codes directly instead.
 */
const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (!config.emailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.password },
    });
  }
  return transporter;
}

const isEmailConfigured = () => config.emailConfigured();

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.info(`[email] SMTP not configured — skipping email to ${to}: "${subject}"`);
    return { skipped: true };
  }
  await t.sendMail({ from: config.smtp.from, to, subject, text, html });
  return { sent: true };
}

async function sendOtpEmail({ to, name, purpose, code, ttlText }) {
  const purposeText = purpose === 'PASSWORD_RESET'
    ? 'reset your ZERA password'
    : purpose === 'ADMIN_INVITE'
      ? 'accept your ZERA admin invitation'
      : 'verify your ZERA email address';
  const expiry = ttlText || `${config.otp.ttlMinutes} minutes`;
  return sendMail({
    to,
    subject: `Your ZERA verification code`,
    text: `Hi ${name},\n\nYour one-time code to ${purposeText} is:\n\n  ${code}\n\nIt expires in ${expiry}. If you didn't request this, you can ignore this email.\n\n— ZERA, Your New Era of Learning`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e6e6ef;border-radius:12px">
        <h2 style="color:#0f172a;margin:0 0 8px">ZERA</h2>
        <p style="color:#334155">Hi ${name},</p>
        <p style="color:#334155">Your one-time code to ${purposeText} is:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:8px;color:#6c5ce7;background:#f4f2ff;padding:14px 20px;border-radius:10px;text-align:center;margin:16px 0">${code}</div>
        <p style="color:#64748b;font-size:13px">It expires in ${expiry}. If you didn't request this, you can ignore this email.</p>
      </div>`,
  });
}

async function sendContactEmail({ name, email, message }) {
  return sendMail({
    to: config.smtp.user || 'contact@zera.local',
    subject: `ZERA contact form: message from ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });
}

module.exports = { sendMail, sendOtpEmail, sendContactEmail, isEmailConfigured };
