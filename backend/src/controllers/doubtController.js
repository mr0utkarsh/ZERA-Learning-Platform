import { listConversations, getConversation, askDoubt, saveAnswerAsNote } from '../services/doubtService.js';

export const list = async (req, res, next) => {
  try { res.json({ success: true, data: await listConversations(req.user.id) }); }
  catch (e) { next(e); }
};
export const get = async (req, res, next) => {
  try { res.json({ success: true, data: await getConversation(req.user.id, req.params.id) }); }
  catch (e) { next(e); }
};
export const ask = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await askDoubt(req.user.id, req.body) }); }
  catch (e) { next(e); }
};
export const saveNote = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await saveAnswerAsNote(req.user.id, req.params.messageId) }); }
  catch (e) { next(e); }
};
