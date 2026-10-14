import { saveAcademicProfile, getAcademicProfile } from '../services/academicService.js';

export const updateAcademic = async (req, res, next) => {
  try { res.json({ success: true, data: await saveAcademicProfile(req.user.id, req.body) }); }
  catch (e) { next(e); }
};
export const getAcademic = async (req, res, next) => {
  try { res.json({ success: true, data: await getAcademicProfile(req.user.id) }); }
  catch (e) { next(e); }
};
