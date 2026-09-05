const express = require('express');
const ctrl = require('../controllers/notesController');
const { authenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
router.use(authenticate);

router.post('/generate', aiLimiter, ctrl.generateNotes);
router.get('/', ctrl.listNotes);
router.get('/:id', ctrl.getNote);
router.delete('/:id', ctrl.deleteNote);

module.exports = router;
