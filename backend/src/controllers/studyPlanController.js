import {
  generateStudyPlan, listStudyPlans, getStudyPlan,
  completeTask, skipTask, rescheduleTask, planSummary
} from '../services/studyPlanService.js';

export const generate = async (req, res, next) => {
  try {
    const useAi = req.body?.useAi === true;
    res.status(201).json({ success: true, data: await generateStudyPlan(req.user.id, req.body, { useAi }) });
  } catch (e) { next(e); }
};
export const list = async (req, res, next) => {
  try { res.json({ success: true, data: await listStudyPlans(req.user.id) }); }
  catch (e) { next(e); }
};
export const get = async (req, res, next) => {
  try { res.json({ success: true, data: await getStudyPlan(req.user.id, req.params.id) }); }
  catch (e) { next(e); }
};
export const summary = async (req, res, next) => {
  try { res.json({ success: true, data: await planSummary(req.user.id, req.params.id) }); }
  catch (e) { next(e); }
};
export const complete = async (req, res, next) => {
  try { res.json({ success: true, data: await completeTask(req.user.id, req.params.taskId) }); }
  catch (e) { next(e); }
};
export const skip = async (req, res, next) => {
  try { res.json({ success: true, data: await skipTask(req.user.id, req.params.taskId) }); }
  catch (e) { next(e); }
};
export const reschedule = async (req, res, next) => {
  try { res.json({ success: true, data: await rescheduleTask(req.user.id, req.params.taskId, req.body.dueDate) }); }
  catch (e) { next(e); }
};
