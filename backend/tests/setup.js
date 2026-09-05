// Force the isolated test database (absolute path) before any module reads config.
const path = require('path');
process.env.DATABASE_URL = `file:${path.join(__dirname, '..', 'prisma', 'test.db')}`;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
process.env.AI_PROVIDER = 'none';
process.env.AI_API_KEY = '';
process.env.SMTP_HOST = '';
process.env.DEV_SHOW_OTP = 'true';
process.env.FRONTEND_URL = 'http://localhost:5173';
