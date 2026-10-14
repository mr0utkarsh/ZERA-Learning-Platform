import express from 'express';
import { authenticate, requireStudent } from '../middleware/authMiddleware.js';
import { getOnboarding, updateProfileSetup, uploadSyllabus } from '../controllers/onboardingController.js';
import { updateAcademic, getAcademic } from '../controllers/academicController.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { onboardingProfileSchema, academicProfileSchema, validateRequest } from '../utils/validators.js';

const router = express.Router();
router.use(authenticate);
router.use(requireStudent);
router.get('/', getOnboarding);
router.put('/profile', validateRequest(onboardingProfileSchema), updateProfileSetup);
// Academic onboarding (Step 2). Skip-friendly: every field is optional.
router.put('/academic', validateRequest(academicProfileSchema), updateAcademic);
router.get('/academic', getAcademic);
// Uploads are expensive (parse + extract + AI), so they are rate limited per
// authenticated user rather than per IP. `authenticate` above has already run,
// so req.user is populated; the IP fallback only covers a malformed session.
const uploadRateKey = (req) => `user:${req.user?.id ?? req.ip ?? 'unknown'}`;

router.post('/syllabus', rateLimit({ windowMs: 60 * 60_000, max: 20, keyGenerator: uploadRateKey }), uploadSyllabus);
export default router;
