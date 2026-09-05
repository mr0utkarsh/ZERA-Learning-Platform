const emailService = require('../services/emailService');
const { badRequest } = require('../utils/errors');
const { ok } = require('../utils/response');
const { isValidEmail } = require('../utils/validate');

async function submitContact(req, res, next) {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !String(name).trim()) throw badRequest('Please tell us your name');
    if (!isValidEmail(email)) throw badRequest('Please provide a valid email address');
    if (!message || String(message).trim().length < 10) throw badRequest('Message must be at least 10 characters');

    if (!emailService.isEmailConfigured()) {
      return ok(res, { delivered: false }, 'Thanks for your message! Email delivery is not configured on this server yet, so your message could not be sent to the team. Please try again later.');
    }
    await emailService.sendContactEmail({ name: String(name).slice(0, 100), email: String(email).slice(0, 200), message: String(message).slice(0, 3000) });
    return ok(res, { delivered: true }, 'Message sent. We will get back to you soon.');
  } catch (err) {
    next(err);
  }
}

module.exports = { submitContact };
