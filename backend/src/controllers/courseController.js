import {
  seedCourseCatalog,
  listAvailableCourses,
  ensureCourseEnrollment,
  getDashboardSnapshot,
  getCourseProgressSnapshot,
  markLessonCompleted,
  buildCourseTree,
  flattenCourseLessons
} from '../services/courseService.js';

export const initializeCatalog = async (req, res, next) => {
  try {
    const courses = await seedCourseCatalog();
    return res.status(200).json({
      success: true,
      data: courses,
      message: 'Course catalog initialized.'
    });
  } catch (error) {
    next(error);
  }
};

export const getCatalog = async (req, res, next) => {
  try {
    const courses = await listAvailableCourses();
    return res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

export const enrollInCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const result = await ensureCourseEnrollment(req.user.id, courseId);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Enrolled successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const snapshot = await getDashboardSnapshot(req.user.id);
    return res.status(200).json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseDetails = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    await ensureCourseEnrollment(req.user.id, courseId);
    const tree = await buildCourseTree(courseId);
    return res.status(200).json({
      success: true,
      data: {
        course: {
          id: tree.id,
          title: tree.title,
          slug: tree.slug,
          description: tree.description,
          difficulty: tree.difficulty,
          isPublished: tree.isPublished
        },
        hierarchy: tree.subjects
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const snapshot = await getCourseProgressSnapshot(req.user.id, courseId);
    return res.status(200).json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    next(error);
  }
};

export const completeLesson = async (req, res, next) => {
  try {
    const { courseId, lessonId } = req.params;
    const result = await markLessonCompleted(req.user.id, courseId, lessonId);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getLessonSequence = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const tree = await buildCourseTree(courseId);
    return res.status(200).json({
      success: true,
      data: flattenCourseLessons(tree)
    });
  } catch (error) {
    next(error);
  }
};
