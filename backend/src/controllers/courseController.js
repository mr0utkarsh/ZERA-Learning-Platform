const prisma = require('../config/prisma');
const progressService = require('../services/progressService');
const { badRequest, notFound, forbidden } = require('../utils/errors');
const { ok, created } = require('../utils/response');
const { requireFields, safeJsonParse } = require('../utils/validate');

/** A course is visible if it belongs to the user or is global (userId null). */
async function assertCourseAccess(userId, courseId) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw notFound('Course not found');
  if (course.userId && course.userId !== userId) throw forbidden('You do not have access to this course');
  return course;
}

async function listCourses(req, res, next) {
  try {
    const courses = await prisma.course.findMany({
      where: { OR: [{ userId: req.user.id }, { userId: null }] },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { subjects: true } } },
    });
    const withProgress = await Promise.all(courses.map(async (c) => {
      const p = await progressService.getCourseProgress(req.user.id, c.id);
      return {
        id: c.id, name: c.name, description: c.description, institution: c.institution,
        source: c.source, isOwn: c.userId === req.user.id, subjectCount: c._count.subjects,
        progress: p.progress, totalLessons: p.totalLessons, completedLessons: p.completedLessons,
        createdAt: c.createdAt,
      };
    }));
    return ok(res, { courses: withProgress });
  } catch (err) {
    next(err);
  }
}

async function getCourse(req, res, next) {
  try {
    await assertCourseAccess(req.user.id, req.params.id);
    const tree = await progressService.getCourseProgress(req.user.id, req.params.id);
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    return ok(res, { course: { id: course.id, name: course.name, description: course.description, institution: course.institution, source: course.source }, ...tree });
  } catch (err) {
    next(err);
  }
}

async function createCourse(req, res, next) {
  try {
    requireFields(req.body, ['name']);
    const course = await prisma.course.create({
      data: {
        name: String(req.body.name).trim().slice(0, 200),
        description: req.body.description ? String(req.body.description).slice(0, 1000) : null,
        institution: req.body.institution ? String(req.body.institution).slice(0, 200) : null,
        userId: req.user.id,
        source: 'MANUAL',
      },
    });
    return created(res, { course }, 'Course created');
  } catch (err) {
    next(err);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) throw notFound('Course not found');
    if (course.userId !== req.user.id) throw forbidden('You can only delete your own courses');
    await prisma.course.delete({ where: { id: course.id } });
    return ok(res, null, 'Course deleted');
  } catch (err) {
    next(err);
  }
}

// ---------- Hierarchy creation (manual builder) ----------

const NODE_LIMITS = { subject: 12, unit: 15, chapter: 20, topic: 25, lesson: 40 };

async function addSubject(req, res, next) {
  try {
    requireFields(req.body, ['name']);
    await assertCourseAccess(req.user.id, req.params.courseId);
    const ownCourse = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!ownCourse.userId) throw forbidden('Global courses are read-only. Create your own course to edit.');
    const count = await prisma.subject.count({ where: { courseId: ownCourse.id } });
    if (count >= NODE_LIMITS.subject) throw badRequest(`A course can have at most ${NODE_LIMITS.subject} subjects`);
    const subject = await prisma.subject.create({
      data: { name: String(req.body.name).trim().slice(0, 200), code: req.body.code ? String(req.body.code).slice(0, 40) : null, courseId: ownCourse.id, order: count },
    });
    return created(res, { subject });
  } catch (err) {
    next(err);
  }
}

async function addUnit(req, res, next) {
  try {
    requireFields(req.body, ['name']);
    const subject = await prisma.subject.findUnique({ where: { id: req.params.subjectId }, include: { course: true } });
    if (!subject) throw notFound('Subject not found');
    if (subject.course.userId !== req.user.id) throw forbidden('This course is read-only');
    const order = await prisma.unit.count({ where: { subjectId: subject.id } });
    const unit = await prisma.unit.create({ data: { name: String(req.body.name).trim().slice(0, 200), subjectId: subject.id, order } });
    return created(res, { unit });
  } catch (err) {
    next(err);
  }
}

async function addChapter(req, res, next) {
  try {
    requireFields(req.body, ['name']);
    const unit = await prisma.unit.findUnique({ where: { id: req.params.unitId }, include: { subject: { include: { course: true } } } });
    if (!unit) throw notFound('Unit not found');
    if (unit.subject.course.userId !== req.user.id) throw forbidden('This course is read-only');
    const order = await prisma.chapter.count({ where: { unitId: unit.id } });
    const chapter = await prisma.chapter.create({ data: { name: String(req.body.name).trim().slice(0, 200), unitId: unit.id, order } });
    return created(res, { chapter });
  } catch (err) {
    next(err);
  }
}

async function addTopic(req, res, next) {
  try {
    requireFields(req.body, ['name']);
    const chapter = await prisma.chapter.findUnique({ where: { id: req.params.chapterId }, include: { unit: { include: { subject: { include: { course: true } } } } } });
    if (!chapter) throw notFound('Chapter not found');
    if (chapter.unit.subject.course.userId !== req.user.id) throw forbidden('This course is read-only');
    const order = await prisma.topic.count({ where: { chapterId: chapter.id } });
    const topic = await prisma.topic.create({ data: { name: String(req.body.name).trim().slice(0, 200), chapterId: chapter.id, order, important: req.body.important === true } });
    return created(res, { topic });
  } catch (err) {
    next(err);
  }
}

async function addLesson(req, res, next) {
  try {
    requireFields(req.body, ['title']);
    const topic = await prisma.topic.findUnique({ where: { id: req.params.topicId }, include: { chapter: { include: { unit: { include: { subject: { include: { course: true } } } } } } } });
    if (!topic) throw notFound('Topic not found');
    if (topic.chapter.unit.subject.course.userId !== req.user.id) throw forbidden('This course is read-only');
    const order = await prisma.lesson.count({ where: { topicId: topic.id } });
    const lesson = await prisma.lesson.create({
      data: {
        title: String(req.body.title).trim().slice(0, 300),
        content: req.body.content ? String(req.body.content).slice(0, 20000) : null,
        objectives: Array.isArray(req.body.objectives) ? JSON.stringify(req.body.objectives.map((o) => String(o).slice(0, 300)).slice(0, 20)) : null,
        topicId: topic.id,
        order,
      },
    });
    return created(res, { lesson });
  } catch (err) {
    next(err);
  }
}

// ---------- Lesson access & completion ----------

async function getLesson(req, res, next) {
  try {
    const detail = await progressService.getLessonDetail(req.user.id, req.params.id);
    if (!detail) throw notFound('Lesson not found');
    const { lesson, completion } = detail;
    const course = lesson.topic.chapter.unit.subject.course;
    if (course.userId && course.userId !== req.user.id) throw forbidden('You do not have access to this lesson');

    const siblings = lesson.topic.lessons;
    const idx = siblings.findIndex((l) => l.id === lesson.id);
    const note = await prisma.lessonNote.findUnique({ where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } } });

    return ok(res, {
      lessonOwned: course.userId === req.user.id,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        objectives: safeJsonParse(lesson.objectives, []),
        order: lesson.order,
        completed: Boolean(completion),
        completedAt: completion?.completedAt || null,
        breadcrumbs: {
          course: { id: course.id, name: course.name },
          subject: { id: lesson.topic.chapter.unit.subject.id, name: lesson.topic.chapter.unit.subject.name },
          unit: { id: lesson.topic.chapter.unit.id, name: lesson.topic.chapter.unit.name },
          chapter: { id: lesson.topic.chapter.id, name: lesson.topic.chapter.name },
          topic: { id: lesson.topic.id, name: lesson.topic.name },
        },
        prevLesson: idx > 0 ? siblings[idx - 1] : null,
        nextLesson: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
        siblingLessons: siblings,
      },
      personalNote: note ? { content: note.content, updatedAt: note.updatedAt } : null,
    });
  } catch (err) {
    next(err);
  }
}

async function markLessonComplete(req, res, next) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id },
      include: {
        topic: {
          include: {
            chapter: {
              include: {
                unit: { include: { subject: { include: { course: true } } } },
              },
            },
          },
        },
      },
    });
    if (!lesson) throw notFound('Lesson not found');
    const course = lesson.topic.chapter.unit.subject.course;
    if (course.userId && course.userId !== req.user.id) throw forbidden('You do not have access to this lesson');

    const completion = await prisma.lessonCompletion.upsert({
      where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } },
      create: { userId: req.user.id, lessonId: lesson.id },
      update: {},
    });
    if (req.body?.log !== false) {
      await prisma.activityLog.create({
        data: { userId: req.user.id, type: 'LESSON_COMPLETED', message: `Completed lesson "${lesson.title}"`, meta: JSON.stringify({ lessonId: lesson.id }) },
      });
    }
    const courseProgress = await progressService.getCourseProgress(req.user.id, course.id);
    return ok(res, { completed: true, completedAt: completion.completedAt, courseProgress: courseProgress.progress }, 'Lesson marked complete');
  } catch (err) {
    next(err);
  }
}

async function unmarkLessonComplete(req, res, next) {
  try {
    await prisma.lessonCompletion.deleteMany({ where: { userId: req.user.id, lessonId: req.params.id } });
    return ok(res, { completed: false }, 'Lesson marked incomplete');
  } catch (err) {
    next(err);
  }
}

async function saveLessonNote(req, res, next) {
  try {
    requireFields(req.body, ['content']);
    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
    if (!lesson) throw notFound('Lesson not found');
    const note = await prisma.lessonNote.upsert({
      where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } },
      create: { userId: req.user.id, lessonId: lesson.id, content: String(req.body.content).slice(0, 10000) },
      update: { content: String(req.body.content).slice(0, 10000) },
    });
    return ok(res, { note }, 'Note saved');
  } catch (err) {
    next(err);
  }
}

async function logStudySession(req, res, next) {
  try {
    const minutes = parseInt(req.body?.minutes, 10);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 480) throw badRequest('minutes must be between 1 and 480');
    await prisma.studySession.create({
      data: { userId: req.user.id, lessonId: req.body.lessonId || null, minutes },
    });
    return ok(res, null, 'Study time recorded');
  } catch (err) {
    next(err);
  }
}


// ---------- Full CRUD for the hierarchy (update + delete) ----------

/** Resolve any hierarchy node and enforce that the caller owns its course. */
async function ownNode(userId, model, id) {
  const includes = {
    subject: { course: true },
    unit: { subject: { include: { course: true } } },
    chapter: { unit: { include: { subject: { include: { course: true } } } } },
    topic: { chapter: { include: { unit: { include: { subject: { include: { course: true } } } } } } },
    lesson: { topic: { include: { chapter: { include: { unit: { include: { subject: { include: { course: true } } } } } } } } },
  };
  const node = await prisma[model].findUnique({ where: { id }, include: includes[model] });
  if (!node) throw notFound('Resource not found');
  const course = model === 'subject' ? node.course
    : model === 'unit' ? node.subject.course
    : model === 'chapter' ? node.unit.subject.course
    : model === 'topic' ? node.chapter.unit.subject.course
    : node.topic.chapter.unit.subject.course;
  if (course.userId !== userId) throw forbidden('This course is read-only for you');
  return node;
}

const cleanName = (v, label) => {
  if (v === undefined) return undefined;
  const n = String(v).trim();
  if (!n || n.length > 300) throw badRequest(`${label} must be 1-300 characters`);
  return n;
};

async function updateCourse(req, res, next) {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) throw notFound('Course not found');
    if (course.userId !== req.user.id) throw forbidden('You can only update your own courses');
    const data = {};
    if (req.body?.name !== undefined) data.name = cleanName(req.body.name, 'Course name');
    if (req.body?.description !== undefined) data.description = String(req.body.description).slice(0, 1000) || null;
    if (req.body?.institution !== undefined) data.institution = String(req.body.institution).slice(0, 200) || null;
    const updated = await prisma.course.update({ where: { id: course.id }, data });
    return ok(res, { course: updated }, 'Course updated');
  } catch (err) {
    next(err);
  }
}

async function updateSubject(req, res, next) {
  try {
    await ownNode(req.user.id, 'subject', req.params.id);
    const data = {};
    if (req.body?.name !== undefined) data.name = cleanName(req.body.name, 'Subject name');
    if (req.body?.code !== undefined) data.code = req.body.code ? String(req.body.code).slice(0, 40) : null;
    const subject = await prisma.subject.update({ where: { id: req.params.id }, data });
    return ok(res, { subject }, 'Subject updated');
  } catch (err) {
    next(err);
  }
}

async function deleteSubject(req, res, next) {
  try {
    await ownNode(req.user.id, 'subject', req.params.id);
    await prisma.subject.delete({ where: { id: req.params.id } });
    return ok(res, null, 'Subject deleted');
  } catch (err) {
    next(err);
  }
}

async function updateUnit(req, res, next) {
  try {
    await ownNode(req.user.id, 'unit', req.params.id);
    const data = {};
    if (req.body?.name !== undefined) data.name = cleanName(req.body.name, 'Unit name');
    const unit = await prisma.unit.update({ where: { id: req.params.id }, data });
    return ok(res, { unit }, 'Unit updated');
  } catch (err) {
    next(err);
  }
}

async function deleteUnit(req, res, next) {
  try {
    await ownNode(req.user.id, 'unit', req.params.id);
    await prisma.unit.delete({ where: { id: req.params.id } });
    return ok(res, null, 'Unit deleted');
  } catch (err) {
    next(err);
  }
}

async function updateChapter(req, res, next) {
  try {
    await ownNode(req.user.id, 'chapter', req.params.id);
    const data = {};
    if (req.body?.name !== undefined) data.name = cleanName(req.body.name, 'Chapter name');
    const chapter = await prisma.chapter.update({ where: { id: req.params.id }, data });
    return ok(res, { chapter }, 'Chapter updated');
  } catch (err) {
    next(err);
  }
}

async function deleteChapter(req, res, next) {
  try {
    await ownNode(req.user.id, 'chapter', req.params.id);
    await prisma.chapter.delete({ where: { id: req.params.id } });
    return ok(res, null, 'Chapter deleted');
  } catch (err) {
    next(err);
  }
}

async function updateTopic(req, res, next) {
  try {
    await ownNode(req.user.id, 'topic', req.params.id);
    const data = {};
    if (req.body?.name !== undefined) data.name = cleanName(req.body.name, 'Topic name');
    if (req.body?.important !== undefined) data.important = req.body.important === true;
    const topic = await prisma.topic.update({ where: { id: req.params.id }, data });
    return ok(res, { topic }, 'Topic updated');
  } catch (err) {
    next(err);
  }
}

async function deleteTopic(req, res, next) {
  try {
    await ownNode(req.user.id, 'topic', req.params.id);
    await prisma.topic.delete({ where: { id: req.params.id } });
    return ok(res, null, 'Topic deleted');
  } catch (err) {
    next(err);
  }
}

async function updateLesson(req, res, next) {
  try {
    await ownNode(req.user.id, 'lesson', req.params.id);
    const data = {};
    if (req.body?.title !== undefined) data.title = cleanName(req.body.title, 'Lesson title');
    if (req.body?.content !== undefined) data.content = req.body.content ? String(req.body.content).slice(0, 20000) : null;
    if (req.body?.objectives !== undefined) {
      data.objectives = Array.isArray(req.body.objectives)
        ? JSON.stringify(req.body.objectives.map((o) => String(o).slice(0, 300)).slice(0, 20))
        : null;
    }
    const lesson = await prisma.lesson.update({ where: { id: req.params.id }, data });
    return ok(res, { lesson: { id: lesson.id, title: lesson.title, content: lesson.content, objectives: safeJsonParse(lesson.objectives, []) } }, 'Lesson updated');
  } catch (err) {
    next(err);
  }
}

async function deleteLesson(req, res, next) {
  try {
    await ownNode(req.user.id, 'lesson', req.params.id);
    await prisma.lesson.delete({ where: { id: req.params.id } });
    return ok(res, null, 'Lesson deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  assertCourseAccess, listCourses, getCourse, createCourse, updateCourse, deleteCourse,
  updateSubject, deleteSubject, updateUnit, deleteUnit,
  updateChapter, deleteChapter, updateTopic, deleteTopic,
  updateLesson, deleteLesson,
  addSubject, addUnit, addChapter, addTopic, addLesson,
  getLesson, markLessonComplete, unmarkLessonComplete, saveLessonNote, logStudySession,
};

