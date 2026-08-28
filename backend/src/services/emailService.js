import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: Number(env.EMAIL_PORT || 587),
  secure: Number(env.EMAIL_PORT || 587) === 465,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS
  }
});

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
      throw new Error(
        'Password reset email is not configured. Check EMAIL_PROVIDER, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS and EMAIL_FROM.'
      );
    }

    if (!email) {
      throw new Error('A valid email address is required.');
    }

    if (!resetToken) {
      throw new Error('Password reset token is required.');
    }

    const resetUrl = `http://localhost:3000/reset-password?token=${encodeURIComponent(resetToken)}`;

    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: 'ZERA Learning Platform - Password Reset',
      text: `Hello ${userName || 'ZERA user'},

We received a request to reset your ZERA Learning Platform password.

Use the following link to reset your password:

${resetUrl}

This password reset link will expire soon.

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

          <p>This password reset link will expire soon.</p>

          <p>If you did not request a password reset, you can safely ignore this email.</p>

          <p>Regards,<br>ZERA Learning Platform</p>
        </div>
      `
    });

    return {
      success: true,
      provider: env.EMAIL_PROVIDER,
      recipient: email,
      messageId: info.messageId
    };
  }
};