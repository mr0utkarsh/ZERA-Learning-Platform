import {
  createQuiz, listQuizzes, getQuizForAttempt, submitAttempt, listAttempts
} from '../services/quizService.js';

export const create = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await createQuiz(req.user.id, req.body) }); }
  catch (e) { next(e); }
};
export const list = async (req, res, next) => {
  try { res.json({ success: true, data: await listQuizzes(req.user.id) }); }
  catch (e) { next(e); }
};
export const get = async (req, res, next) => {
  try { res.json({ success: true, data: await getQuizForAttempt(req.user.id, req.params.id) }); }
  catch (e) { next(e); }
};
export const submit = async (req, res, next) => {
  try { res.json({ success: true, data: await submitAttempt(req.user.id, req.params.id, req.body.answers) }); }
  catch (e) { next(e); }
};
export const attempts = async (req, res, next) => {
  try { res.json({ success: true, data: await listAttempts(req.user.id) }); }
  catch (e) { next(e); }
};
