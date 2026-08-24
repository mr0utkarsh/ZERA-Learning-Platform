import { env } from '../config/env.js';
import nodemailer from 'nodemailer';

export const emailService = {
  isConfigured() {
    const provider = (env.EMAIL_PROVIDER || '').toLowerCase();

    if (!provider) return false;

    if (provider === 'smtp') {
      return Boolean(env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS);
    }

    return false;
  },

  async sendPasswordResetEmail(email, userName, resetToken) {
    if (!this.isConfigured()) {
      throw new Error(
        'Password reset email is not configured. Please set EMAIL_PROVIDER, EMAIL_HOST, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM in the environment.'
      );
    }

    if (!email) {
      throw new Error('A valid email address is required to send a password reset email.');
    }

    if (!resetToken) {
      throw new Error('A password reset token is required.');
    }

    const transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT || 587,
      secure: Boolean(env.EMAIL_SECURE),
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS }
    });
    const resetUrl = `${env.CLIENT_URL || 'http://localhost:8000'}/reset-password.html?token=${encodeURIComponent(resetToken)}`;
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Reset your ZERA password',
      text: `Hello ${userName || 'ZERA user'}, reset your password using this link: ${resetUrl}`,
      html: `<p>Hello ${userName || 'ZERA user'},</p><p><a href="${resetUrl}">Reset your ZERA password</a></p><p>This link expires soon.</p>`
    });

    return { success: true, provider: env.EMAIL_PROVIDER, recipient: email };
  }
};

export const sendOtpEmail = async (email, userName, otp) => {
  if (!emailService.isConfigured()) {
    throw new Error('OTP email is not configured. Set EMAIL_PROVIDER, EMAIL_HOST, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM.');
  }
  const transporter = nodemailer.createTransport({ host: env.EMAIL_HOST, port: env.EMAIL_PORT, secure: env.EMAIL_SECURE, auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS } });
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Your ZERA verification code',
    text: `Hello ${userName || 'ZERA user'}, your verification code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Hello ${userName || 'ZERA user'},</p><p>Your verification code is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`
  });
};
