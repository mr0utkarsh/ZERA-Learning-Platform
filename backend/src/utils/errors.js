class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (msg, details) => new ApiError(400, msg || 'Bad request', details);
const unauthorized = (msg) => new ApiError(401, msg || 'Authentication required');
const forbidden = (msg) => new ApiError(403, msg || 'You do not have access to this resource');
const notFound = (msg) => new ApiError(404, msg || 'Resource not found');
const conflict = (msg) => new ApiError(409, msg || 'Conflict');
const tooMany = (msg) => new ApiError(429, msg || 'Too many requests, please slow down');
const serverError = (msg) => new ApiError(500, msg || 'Internal server error');
const notConfigured = (msg) => new ApiError(503, msg || 'Service not configured');

module.exports = { ApiError, badRequest, unauthorized, forbidden, notFound, conflict, tooMany, serverError, notConfigured };
