const express = require('express');
const ctrl = require('../controllers/courseController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', ctrl.listCourses);
router.post('/', ctrl.createCourse);
router.get('/:id', ctrl.getCourse);
router.patch('/:id', ctrl.updateCourse);
router.delete('/:id', ctrl.deleteCourse);

router.post('/:courseId/subjects', ctrl.addSubject);
router.post('/subjects/:subjectId/units', ctrl.addUnit);
router.post('/units/:unitId/chapters', ctrl.addChapter);
router.post('/chapters/:chapterId/topics', ctrl.addTopic);
router.post('/topics/:topicId/lessons', ctrl.addLesson);

router.patch('/subjects/:id', ctrl.updateSubject);
router.delete('/subjects/:id', ctrl.deleteSubject);
router.patch('/units/:id', ctrl.updateUnit);
router.delete('/units/:id', ctrl.deleteUnit);
router.patch('/chapters/:id', ctrl.updateChapter);
router.delete('/chapters/:id', ctrl.deleteChapter);
router.patch('/topics/:id', ctrl.updateTopic);
router.delete('/topics/:id', ctrl.deleteTopic);

router.get('/lessons/:id', ctrl.getLesson);
router.patch('/lessons/:id', ctrl.updateLesson);
router.delete('/lessons/:id', ctrl.deleteLesson);
router.post('/lessons/:id/complete', ctrl.markLessonComplete);
router.delete('/lessons/:id/complete', ctrl.unmarkLessonComplete);
router.put('/lessons/:lessonId/note', ctrl.saveLessonNote);
router.post('/study-sessions', ctrl.logStudySession);

module.exports = router;
