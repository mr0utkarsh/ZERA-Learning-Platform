import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const norm = (value, max) => String(value ?? '').trim().slice(0, max);

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

/**
 * Persists a student-confirmed syllabus structure (Step 4).
 *
 * The structure is taken verbatim from the student's review screen: the AI only
 * ever *proposes* subjects/units/topics, and this service stores exactly what
 * the student confirmed, edited, added, or removed. Nothing is invented here.
 *
 * The whole hierarchy is written in a single transaction so a syllabus is never
 * left half-created, and the source upload (when present) is marked confirmed.
 */
export const saveConfirmedSyllabus = async (userId, input) => {
  const courseName = norm(input.courseName, 160);
  if (!courseName) throw new ApiError(400, 'A course name is required.');

  const subjects = Array.isArray(input.subjects) ? input.subjects : [];
  if (subjects.length === 0) throw new ApiError(400, 'Add at least one subject before saving.');

  const examDate = input.examDate ? new Date(input.examDate) : null;
  if (input.examDate && Number.isNaN(examDate?.getTime())) {
    throw new ApiError(400, 'The exam date is not a valid date.');
  }

  const created = await prisma.$transaction(async (tx) => {
    const syllabus = await tx.confirmedSyllabus.create({
      data: {
        userId,
        uploadId: input.uploadId || null,
        courseName,
        semester: norm(input.semester, 40) || null,
        institution: norm(input.institution, 160) || null,
        examType: norm(input.examType, 80) || null,
        examDate,
        status: 'CONFIRMED'
      }
    });

    for (let s = 0; s < subjects.length; s += 1) {
      const subjectInput = subjects[s];
      const subject = await tx.confirmedSubject.create({
        data: {
          syllabusId: syllabus.id,
          title: norm(subjectInput.title, 160),
          sequence: s
        }
      });

      const units = Array.isArray(subjectInput.units) ? subjectInput.units : [];
      for (let u = 0; u < units.length; u += 1) {
        const unitInput = units[u];
        const unit = await tx.confirmedUnit.create({
          data: { subjectId: subject.id, title: norm(unitInput.title, 160), sequence: u }
        });

        const topics = Array.isArray(unitInput.topics) ? unitInput.topics : [];
        if (topics.length === 0) continue;
        await tx.confirmedTopic.createMany({
          data: topics.map((topicInput, t) => {
            const difficulty = norm(topicInput.difficulty, 10).toLowerCase();
            return {
              unitId: unit.id,
              title: norm(topicInput.title, 200),
              description: norm(topicInput.description, 2000) || null,
              difficulty: DIFFICULTIES.has(difficulty) ? difficulty : null,
              sequence: t,
              uncertain: Boolean(topicInput.uncertain),
              needsRevision: Boolean(topicInput.needsRevision)
            };
          })
        });
      }
    }

    if (input.uploadId) {
      // Ownership is enforced by scoping the update to this user.
      await tx.syllabusUpload.updateMany({
        where: { id: input.uploadId, userId },
        data: { confirmed: true, confirmedAt: new Date() }
      });
    }

    return syllabus;
  });

  return getConfirmedSyllabus(userId, created.id);
};

/** Fetches a confirmed syllabus with its full hierarchy, enforcing ownership. */
export const getConfirmedSyllabus = async (userId, id) => {
  const syllabus = await prisma.confirmedSyllabus.findFirst({
    where: { id, userId },
    include: {
      subjects: {
        orderBy: { sequence: 'asc' },
        include: {
          units: {
            orderBy: { sequence: 'asc' },
            include: {
              topics: {
                orderBy: { sequence: 'asc' },
                include: { progress: true }
              }
            }
          }
        }
      }
    }
  });
  if (!syllabus) throw new ApiError(404, 'Syllabus not found.');
  return syllabus;
};

export const listConfirmedSyllabi = async (userId) =>
  prisma.confirmedSyllabus.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { subjects: true } } }
  });
