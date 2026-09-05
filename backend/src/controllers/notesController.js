const prisma = require('../config/prisma');
const ai = require('../ai');
const { badRequest, notFound } = require('../utils/errors');
const { ok, created } = require('../utils/response');
const { NoteTargetType, NoteStyle, ActivityType } = require('../utils/enums');

/** Resolve the target entity, enforce access, and build context for the AI. */
async function resolveTarget(userId, targetType, targetId) {
  const t = targetType.toUpperCase();
  if (!NoteTargetType[t]) throw badRequest('targetType must be one of SUBJECT, UNIT, CHAPTER, TOPIC, LESSON');

  if (t === 'SUBJECT') {
    const subject = await prisma.subject.findUnique({ where: { id: targetId }, include: { course: true, units: { include: { chapters: { include: { topics: { select: { name: true } } } } } } } });
    if (!subject) throw notFound('Subject not found');
    if (subject.course.userId && subject.course.userId !== userId) throw notFound('Subject not found');
    const outline = subject.units.map((u) => `Unit: ${u.name}\n${u.chapters.map((c) => `  Chapter: ${c.name} (${c.topics.map((x) => x.name).join('; ')})`).join('\n')}`).join('\n');
    return { name: subject.name, context: `Course: ${subject.course.name}\nSubject: ${subject.name}\n\nSyllabus outline:\n${outline}` };
  }
  if (t === 'UNIT') {
    const unit = await prisma.unit.findUnique({ where: { id: targetId }, include: { subject: { include: { course: true } }, chapters: { include: { topics: { select: { name: true } } } } } });
    if (!unit) throw notFound('Unit not found');
    if (unit.subject.course.userId && unit.subject.course.userId !== userId) throw notFound('Unit not found');
    const outline = unit.chapters.map((c) => `Chapter: ${c.name}\n  Topics: ${c.topics.map((x) => x.name).join('; ')}`).join('\n');
    return { name: unit.name, context: `Subject: ${unit.subject.name}\nUnit: ${unit.name}\n\nOutline:\n${outline}` };
  }
  if (t === 'CHAPTER') {
    const chapter = await prisma.chapter.findUnique({ where: { id: targetId }, include: { unit: { include: { subject: { include: { course: true } } } }, topics: { select: { name: true, important: true } } } });
    if (!chapter) throw notFound('Chapter not found');
    if (chapter.unit.subject.course.userId && chapter.unit.subject.course.userId !== userId) throw notFound('Chapter not found');
    return { name: chapter.name, context: `Subject: ${chapter.unit.subject.name}\nUnit: ${chapter.unit.name}\nChapter: ${chapter.name}\nTopics: ${chapter.topics.map((t) => t.name + (t.important ? ' (important)' : '')).join('; ')}` };
  }
  if (t === 'TOPIC') {
    const topic = await prisma.topic.findUnique({ where: { id: targetId }, include: { chapter: { include: { unit: { include: { subject: { include: { course: true } } } } } }, lessons: { select: { title: true, content: true } } } });
    if (!topic) throw notFound('Topic not found');
    if (topic.chapter.unit.subject.course.userId && topic.chapter.unit.subject.course.userId !== userId) throw notFound('Topic not found');
    const lessonBits = topic.lessons.filter((l) => l.content).map((l) => `${l.title}: ${l.content}`).join('\n');
    return { name: topic.name, context: `Subject: ${topic.chapter.unit.subject.name}\nChapter: ${topic.chapter.name}\nTopic: ${topic.name}${lessonBits ? `\n\nLesson material:\n${lessonBits}` : ''}` };
  }
  // LESSON
  const lesson = await prisma.lesson.findUnique({ where: { id: targetId }, include: { topic: { include: { chapter: { include: { unit: { include: { subject: { include: { course: true } } } } } } } } } });
  if (!lesson) throw notFound('Lesson not found');
  if (lesson.topic.chapter.unit.subject.course.userId && lesson.topic.chapter.unit.subject.course.userId !== userId) throw notFound('Lesson not found');
  return { name: lesson.title, context: `Subject: ${lesson.topic.chapter.unit.subject.name}\nTopic: ${lesson.topic.name}\nLesson: ${lesson.title}${lesson.content ? `\n\nLesson content:\n${lesson.content}` : ''}` };
}

/** Generate AI notes for any level of the hierarchy and store them. */
async function generateNotes(req, res, next) {
  try {
    const { targetType, targetId, style } = req.body || {};
    if (!targetType || !targetId) throw badRequest('targetType and targetId are required');
    const target = await resolveTarget(req.user.id, targetType, targetId);

    const noteStyle = style === 'HANDWRITTEN' ? NoteStyle.HANDWRITTEN : NoteStyle.STANDARD;
    const notes = await ai.generateNotes({ level: targetType, name: target.name, context: target.context, style: noteStyle });

    const saved = await prisma.note.create({
      data: {
        userId: req.user.id,
        targetType: targetType.toUpperCase(),
        targetId,
        title: notes.title,
        content: JSON.stringify(notes),
        style: noteStyle,
        source: 'AI',
      },
    });
    await prisma.activityLog.create({
      data: { userId: req.user.id, type: ActivityType.NOTE_GENERATED, message: `Generated ${noteStyle === 'HANDWRITTEN' ? 'handwritten-style ' : ''}notes for "${target.name}"` },
    });
    return created(res, { note: serializeNote(saved) }, 'Notes generated');
  } catch (err) {
    next(err);
  }
}

function serializeNote(n) {
  let parsed = {};
  try { parsed = JSON.parse(n.content); } catch { parsed = { content: n.content }; }
  return { id: n.id, targetType: n.targetType, targetId: n.targetId, title: n.title, style: n.style, source: n.source, createdAt: n.createdAt, ...parsed };
}

async function listNotes(req, res, next) {
  try {
    const notes = await prisma.note.findMany({
      where: { userId: req.user.id, ...(req.query.targetType ? { targetType: String(req.query.targetType).toUpperCase() } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return ok(res, { notes: notes.map(serializeNote) });
  } catch (err) {
    next(err);
  }
}

async function getNote(req, res, next) {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note || note.userId !== req.user.id) throw notFound('Note not found');
    return ok(res, { note: serializeNote(note) });
  } catch (err) {
    next(err);
  }
}

async function deleteNote(req, res, next) {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note || note.userId !== req.user.id) throw notFound('Note not found');
    await prisma.note.delete({ where: { id: note.id } });
    return ok(res, null, 'Note deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = { generateNotes, listNotes, getNote, deleteNote, resolveTarget };
