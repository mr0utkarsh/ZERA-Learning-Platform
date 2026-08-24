import {
  getAdminOverview,
  getStudentDirectory,
  getStudentDetails,
  updateStudentStatus
} from '../services/adminService.js';

export const adminOverview = async (req, res, next) => {
  try {
    const data = await getAdminOverview();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const listStudents = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const data = await getStudentDirectory({ search: search || '', status: status || '' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const fetchStudent = async (req, res, next) => {
  try {
    const data = await getStudentDetails(req.params.studentId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const setStudentStatus = async (req, res, next) => {
  try {
    const data = await updateStudentStatus(req.params.studentId, req.body.status);
    res.json({ success: true, data, message: `Student status updated to ${req.body.status}.` });
  } catch (error) {
    next(error);
  }
};
