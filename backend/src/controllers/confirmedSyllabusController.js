import {
  saveConfirmedSyllabus,
  getConfirmedSyllabus,
  listConfirmedSyllabi
} from '../services/confirmedSyllabusService.js';

export const confirm = async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await saveConfirmedSyllabus(req.user.id, req.body) });
  } catch (error) { next(error); }
};

export const list = async (req, res, next) => {
  try {
    res.json({ success: true, data: await listConfirmedSyllabi(req.user.id) });
  } catch (error) { next(error); }
};

export const get = async (req, res, next) => {
  try {
    res.json({ success: true, data: await getConfirmedSyllabus(req.user.id, req.params.id) });
  } catch (error) { next(error); }
};
