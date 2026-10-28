import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const getResetUrl = (resetToken) => {
  const baseUrl = (env.PASSWORD_RESET_URL || `${env.CLIENT_URL.replace(/\/$/, '')}/reset-password.html`).trim();
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}token=${encodeURIComponent(resetToken)}`;
};

const getVerifyUrl = (verificationToken) => {
  const baseUrl = (env.CLIENT_URL || 'http://localhost:8000').replace(/\/$/, '');
  return `${baseUrl}/verify-email.html?token=${encodeURIComponent(verificationToken)}`;
};

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

    const resetUrl = getResetUrl(resetToken);
    const transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_SECURE || env.EMAIL_PORT === 465,
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Reset your ZERA password',
      text: `Hello ${userName || 'ZERA user'},\n\nUse this link to reset your password: ${resetUrl}\n\nThis link expires in ${env.PASSWORD_RESET_TOKEN_EXPIRES_IN}. If you did not request it, you can ignore this email.`,
      html: `<p>Hello ${userName || 'ZERA user'},</p><p>Use the link below to reset your ZERA password:</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in ${env.PASSWORD_RESET_TOKEN_EXPIRES_IN}. If you did not request it, you can ignore this email.</p>`
    });

    return { success: true };
  },

  async sendVerificationEmail(email, userName, verificationToken) {
    if (!this.isConfigured()) {
      throw new Error(
        'Email verification is not configured. Please set EMAIL_PROVIDER, EMAIL_HOST, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM in the environment.'
      );
    }

    if (!email) {
      throw new Error('A valid email address is required to send a verification email.');
    }

    const verifyUrl = getVerifyUrl(verificationToken);
    const transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_SECURE || env.EMAIL_PORT === 465,
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Verify your ZERA email address',
      text: `Hello ${userName || 'ZERA user'},\n\nPlease verify your email address by clicking this link: ${verifyUrl}\n\nThis link expires in ${env.PASSWORD_RESET_TOKEN_EXPIRES_IN}. If you did not create a ZERA account, you can ignore this email.`,
      html: `<p>Hello ${userName || 'ZERA user'},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verifyUrl}">Verify email address</a></p><p>This link expires in ${env.PASSWORD_RESET_TOKEN_EXPIRES_IN}. If you did not create a ZERA account, you can ignore this email.</p>`
    });

    return { success: true };
  }
};
