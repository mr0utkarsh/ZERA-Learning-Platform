import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Syllabus progress tracking (Feature 9).
 *
 * Completion formula (documented and consistent everywhere):
 *   Each confirmed topic contributes a weight based on its status:
 *     NOT_STARTED    = 0
 *     IN_PROGRESS    = 0.5
 *     COMPLETED      = 1.0
 *     NEEDS_REVISION = 0.5   (still engaged, but not mastered)
 *   A subject's % = sum(topic weights) / count(topics) * 100
 *   A unit's %    = sum(topic weights) / count(topics) * 100
 *   Overall %     = sum(all topic weights) / total topics * 100
 *
 * There is exactly one TopicProgress row per topic (enforced by a unique
 * constraint), so a topic can never be double-counted. Topics with no row yet
 * are treated as NOT_STARTED (weight 0) rather than being fabricated.
 */
export const TOPIC_WEIGHTS = {
  NOT_STARTED: 0,
  IN_PROGRESS: 0.5,
  COMPLETED: 1,
  NEEDS_REVISION: 0.5
};

const VALID_STATUSES = new Set(Object.keys(TOPIC_WEIGHTS));

const pct = (weights) => {
  if (weights.length === 0) return null; // honest "no topics" instead of 0 or 100
  const sum = weights.reduce((acc, w) => acc + w, 0);
  return Math.round((sum / weights.length) * 1000) / 10; // one decimal place
};

/** Loads a confirmed syllabus owned by the user, with topics + progress. */
const loadOwnedSyllabus = async (userId, syllabusId) => {
  const syllabus = await prisma.confirmedSyllabus.findFirst({
    where: { id: syllabusId, userId },
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

const topicWeightsOf = (topics) =>
  topics.map((t) => TOPIC_WEIGHTS[t.progress?.status ?? 'NOT_STARTED'] ?? 0);

/**
 * Computes the full progress breakdown for a syllabus. Returns per-subject,
 * per-unit and per-topic detail plus an overall percentage. Percentages are
 * null (not zero) when a scope contains no topics, so the UI can distinguish
 * "nothing to measure" from "0% complete".
 */
export const getSyllabusProgress = async (userId, syllabusId) => {
  const syllabus = await loadOwnedSyllabus(userId, syllabusId);

  const allWeights = [];
  const subjects = syllabus.subjects.map((subject) => {
    const subjectWeights = [];
    const units = subject.units.map((unit) => {
      const weights = topicWeightsOf(unit.topics);
      subjectWeights.push(...weights);
      return {
        id: unit.id,
        title: unit.title,
        percentage: pct(weights),
        topicCount: unit.topics.length,
        topics: unit.topics.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.progress?.status ?? 'NOT_STARTED',
          needsRevision: t.needsRevision,
          uncertain: t.uncertain
        }))
      };
    });
    allWeights.push(...subjectWeights);
    return {
      id: subject.id,
      title: subject.title,
      percentage: pct(subjectWeights),
      topicCount: subjectWeights.length,
      units
    };
  });

  return {
    syllabusId: syllabus.id,
    courseName: syllabus.courseName,
    semester: syllabus.semester,
    formula: 'overall = sum(topic weights) / total topics, where COMPLETED=1, IN_PROGRESS=0.5, NEEDS_REVISION=0.5, NOT_STARTED=0',
    overallPercentage: pct(allWeights),
    totalTopics: allWeights.length,
    completedTopics: allWeights.filter((w) => w === 1).length,
    subjects
  };
};

/**
 * Sets a topic's status for a user. Ownership is verified by walking the topic
 * up through unit -> subject -> syllabus and matching userId, so a topic id
 * from another student's syllabus is rejected rather than silently applied.
 */
export const setTopicStatus = async (userId, topicId, status) => {
  const normalized = String(status || '').toUpperCase();
  if (!VALID_STATUSES.has(normalized)) {
    throw new ApiError(400, `Status must be one of: ${[...VALID_STATUSES].join(', ')}.`);
  }

  const topic = await prisma.confirmedTopic.findFirst({
    where: {
      id: topicId,
      unit: { subject: { syllabus: { userId } } }
    },
    select: { id: true }
  });
  if (!topic) throw new ApiError(404, 'Topic not found.');

  const completedAt = normalized === 'COMPLETED' ? new Date() : null;

  return prisma.topicProgress.upsert({
    where: { topicId },
    create: { userId, topicId, status: normalized, completedAt },
    update: { status: normalized, completedAt }
  });
};

/** Creates a NOT_STARTED progress row for any topic that lacks one (idempotent). */
export const ensureProgressForSyllabus = async (userId, syllabusId) => {
  const syllabus = await loadOwnedSyllabus(userId, syllabusId);
  const topicIds = [];
  for (const subject of syllabus.subjects) {
    for (const unit of subject.units) {
      for (const topic of unit.topics) topicIds.push(topic.id);
    }
  }
  if (topicIds.length === 0) return 0;

  const result = await prisma.topicProgress.createMany({
    data: topicIds.map((topicId) => ({ userId, topicId, status: 'NOT_STARTED' })),
    skipDuplicates: true
  });
  return result.count;
};
