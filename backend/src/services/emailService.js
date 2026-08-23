import { env } from '../config/env.js';

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

    return {
      success: true,
      provider: env.EMAIL_PROVIDER,
      recipient: email,
      userName: userName || 'ZERA user',
      resetToken,
      note: 'Email delivery is ready to be implemented through the configured provider.'
    };
  }
};
