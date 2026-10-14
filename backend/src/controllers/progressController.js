import {
  getSyllabusProgress,
  setTopicStatus,
  ensureProgressForSyllabus
} from '../services/progressService.js';

export const syllabusProgress = async (req, res, next) => {
  try {
    res.json({ success: true, data: await getSyllabusProgress(req.user.id, req.params.id) });
  } catch (error) { next(error); }
};

export const updateTopic = async (req, res, next) => {
  try {
    const progress = await setTopicStatus(req.user.id, req.params.topicId, req.body.status);
    res.json({ success: true, data: progress });
  } catch (error) { next(error); }
};

export const initProgress = async (req, res, next) => {
  try {
    const count = await ensureProgressForSyllabus(req.user.id, req.params.id);
    res.json({ success: true, data: await getSyllabusProgress(req.user.id, req.params.id), created: count });
  } catch (error) { next(error); }
};
