const config = require('../config');
const { ApiError } = require('../utils/errors');
const { Prisma } = require('@prisma/client');

// 404 for unknown API routes
function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Global error handler — never leaks secrets or stack traces to clients
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = 409;
      message = 'A record with that value already exists';
    } else if (err.code === 'P2025') {
      status = 404;
      message = 'Record not found';
    } else {
      status = 400;
      message = 'Invalid database request';
    }
    details = undefined;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    status = 400;
    message = 'Invalid data supplied';
    details = undefined;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON in request body';
  } else if (err.code === 'LIMIT_FILE_SIZE' || err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : `Upload error: ${err.message}`;
  }

  // 503 "service not configured" errors (e.g. AI provider missing) carry a
  // safe, user-facing explanation — surface it instead of the generic 500 text.
  if (status === 503 && err.code && String(err.code).startsWith('AI_')) {
    const body = { success: false, message, code: err.code };
    return res.status(status).json(body);
  }

  if (status >= 500) {
    // Log full error server-side, hide internals from the client
    console.error('[error]', err);
    message = 'Something went wrong on our side. Please try again.';
  }

  const body = { success: false, message };
  if (details) body.details = details;
  if (config.env === 'development' && status >= 500) body.hint = err.message;
  res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
