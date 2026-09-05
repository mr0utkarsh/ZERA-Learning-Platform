const express = require('express');
const ctrl = require('../controllers/quizController');
const { authenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
router.use(authenticate);

router.post('/generate', aiLimiter, ctrl.generate);
router.get('/', ctrl.listQuizzes);
router.get('/attempts', ctrl.listAttempts);
router.get('/attempts/:id/review', ctrl.getAttemptReview);
router.get('/:id', ctrl.getQuiz);
router.delete('/:id', ctrl.deleteQuiz);
router.post('/:quizId/attempts', ctrl.startAttempt);
router.post('/attempts/:attemptId/answers', ctrl.saveAnswers);
router.post('/attempts/:attemptId/submit', ctrl.submitAttempt);

module.exports = router;
