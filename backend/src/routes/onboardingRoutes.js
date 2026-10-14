import express from 'express';
import { authenticate, requireStudent } from '../middleware/authMiddleware.js';
import { getOnboarding, updateProfileSetup, uploadSyllabus } from '../controllers/onboardingController.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { onboardingProfileSchema, validateRequest } from '../utils/validators.js';

const router = express.Router();
router.use(authenticate);
router.use(requireStudent);
router.get('/', getOnboarding);
router.put('/profile', validateRequest(onboardingProfileSchema), updateProfileSetup);
// Uploads are expensive (parse + extract + AI), so they are rate limited per
// authenticated user rather than per IP. `authenticate` above has already run,
// so req.user is populated; the IP fallback only covers a malformed session.
const uploadRateKey = (req) => `user:${req.user?.id ?? req.ip ?? 'unknown'}`;

router.post('/syllabus', rateLimit({ windowMs: 60 * 60_000, max: 20, keyGenerator: uploadRateKey }), uploadSyllabus);
export default router;
