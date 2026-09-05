const express = require('express');
const ctrl = require('../controllers/studyPlanController');
const { authenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
router.use(authenticate);

router.get('/active', ctrl.getActivePlan);
router.get('/', ctrl.listPlans);
router.post('/generate', aiLimiter, ctrl.generatePlan);
router.post('/tasks/:taskId/toggle', ctrl.toggleTask);
router.post('/:id/abandon', ctrl.abandonPlan);

module.exports = router;
