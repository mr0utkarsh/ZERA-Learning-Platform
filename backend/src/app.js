const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const config = require('./config');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: config.env === 'test' ? true : [config.frontendUrl, config.backendUrl],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Health/config check (no secrets exposed)
app.get('/api/health', async (req, res) => {
  const ai = require('./ai');
  res.json({
    success: true,
    data: {
      status: 'ok',
      name: 'ZERA API',
      env: config.env,
      aiConfigured: await ai.isConfigured(),
      emailConfigured: config.emailConfigured(),
    },
  });
});

app.use('/api', apiLimiter);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/syllabus', require('./routes/syllabusRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));
app.use('/api/doubts', require('./routes/doubtRoutes'));
app.use('/api/quizzes', require('./routes/quizRoutes'));
app.use('/api/tests', require('./routes/quizRoutes')); // mock tests share the quiz engine (type=MOCK_TEST)
app.use('/api/pyqs', require('./routes/pyqRoutes'));
app.use('/api/performance', require('./routes/performanceRoutes'));
app.use('/api/study-plans', require('./routes/studyPlanRoutes'));
app.use('/api/interviews', require('./routes/interviewRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
