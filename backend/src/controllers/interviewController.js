import { startInterview, evaluateInterview, listInterviews, getInterview } from '../services/interviewService.js';

export const start = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await startInterview(req.user.id, req.body) }); }
  catch (e) { next(e); }
};
export const evaluate = async (req, res, next) => {
  try { res.json({ success: true, data: await evaluateInterview(req.user.id, req.params.id, req.body.answers) }); }
  catch (e) { next(e); }
};
export const list = async (req, res, next) => {
  try { res.json({ success: true, data: await listInterviews(req.user.id) }); }
  catch (e) { next(e); }
};
export const get = async (req, res, next) => {
  try { res.json({ success: true, data: await getInterview(req.user.id, req.params.id) }); }
  catch (e) { next(e); }
};
