import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getOnboarding, updateProfileSetup, uploadSyllabus } from '../controllers/onboardingController.js';
import { onboardingProfileSchema, syllabusUploadSchema, validateRequest } from '../utils/validators.js';

const router = express.Router();
router.use(authenticate);
router.get('/', getOnboarding);
router.put('/profile', validateRequest(onboardingProfileSchema), updateProfileSetup);
router.post('/syllabus', validateRequest(syllabusUploadSchema), uploadSyllabus);
export default router;
