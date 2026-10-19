import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, allowedOrigins, isProd } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
<<<<<<< HEAD
import confirmedSyllabusRoutes from './routes/confirmedSyllabusRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import performanceRoutes from './routes/performanceRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import studyPlanRoutes from './routes/studyPlanRoutes.js';
import doubtRoutes from './routes/doubtRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import handwritingRoutes from './routes/handwritingRoutes.js';
import { rateLimit } from './middleware/rateLimit.js';
import { ApiError } from './utils/ApiError.js';
=======
>>>>>>> 4804780593c11e68ae22b39c559dc624c40d29a7

const app = express();

const explicitOrigins = allowedOrigins();

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Requests without an Origin header (curl, server-to-server, health checks)
    // are not browser cross-origin requests and carry no ambient credentials.
    if (!origin) {
      callback(null, true);
      return;
    }

    const permitted = explicitOrigins.some((entry) =>
      entry instanceof RegExp ? entry.test(origin) : entry === origin
    );

    callback(permitted ? null : new ApiError(403, 'Origin not allowed'), permitted);
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'zera-backend',
    environment: env.NODE_ENV
  });
});

// Brute-force protection for credential endpoints, applied before the routers
// so the limit is enforced on the real handlers.
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, max: 10 }));
// Privileged login is a distinct endpoint with a distinct budget, so it needs
// its own limiter or it becomes an unthrottled alternative to /login.
app.use('/api/auth/admin/login', rateLimit({ windowMs: 15 * 60_000, max: 10 }));
// The public registration route is /signup; mounting the limiter on
// /register left account creation completely unthrottled.
app.use('/api/auth/signup', rateLimit({ windowMs: 60 * 60_000, max: 10 }));
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60_000, max: 5 }));
app.use('/api/auth/reset-password', rateLimit({ windowMs: 60 * 60_000, max: 5 }));
app.use('/api/auth/verify-otp', rateLimit({ windowMs: 15 * 60_000, max: 10 }));

app.use('/api/auth', authRoutes);
app.use('/api', courseRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
<<<<<<< HEAD
app.use('/api/syllabus', confirmedSyllabusRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/handwriting', handwritingRoutes);
=======
>>>>>>> 4804780593c11e68ae22b39c559dc624c40d29a7

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const isClientError = status < 500;

  if (!isClientError) {
    console.error('[unhandled]', err);
  }

  // A body rejected mid-stream (e.g. an oversized upload) still has unread
  // bytes on the socket. Answer, then close, so the client reliably receives the
  // status instead of a connection reset.
  if (req.unread && req.readable) {
    res.set('Connection', 'close');
  }

  res.status(status).json({
    success: false,
    // 5xx messages can contain SQL, file paths or provider payloads, so they are
    // never echoed to the client. 4xx messages are deliberate and safe.
    message: isClientError ? err.message || 'Request failed' : 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && !isClientError ? { debug: err.message } : {})
  });
});

export default app;
