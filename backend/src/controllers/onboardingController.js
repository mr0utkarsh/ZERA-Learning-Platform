import { getOnboardingState, saveProfileSetup, saveSyllabusUpload } from '../services/onboardingService.js';

export const getOnboarding = async (req, res, next) => {
  try { res.json({ success: true, data: await getOnboardingState(req.user.id) }); } catch (error) { next(error); }
};

export const updateProfileSetup = async (req, res, next) => {
  try { res.json({ success: true, data: await saveProfileSetup(req.user.id, req.body) }); } catch (error) { next(error); }
};

export const uploadSyllabus = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await saveSyllabusUpload(req.user.id, req.body) }); } catch (error) { next(error); }
};
