import { getPerformance } from '../services/performanceService.js';

export const index = async (req, res, next) => {
  try { res.json({ success: true, data: await getPerformance(req.user.id) }); }
  catch (e) { next(e); }
};
