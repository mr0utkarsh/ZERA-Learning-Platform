import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const norm = (v, max) => String(v ?? '').trim().slice(0, max);
const LEVELS = new Set(['beginner', 'intermediate', 'advanced']);

/**
 * Learning resources (Feature 11). Resources are curated (admin-managed) and
 * never fabricated: each carries a real URL and an optional source. Students
 * browse, filter, bookmark, and mark completion. The `verified` flag records
 * that an admin reviewed the link — it is never assumed.
 */
export const listResources = async ({ q, skill, technology, level, verifiedOnly } = {}) => {
  const where = {};
  if (skill) where.skill = { equals: skill, mode: 'insensitive' };
  if (technology) where.technology = { equals: technology, mode: 'insensitive' };
  if (level && LEVELS.has(String(level).toLowerCase())) where.level = String(level).toLowerCase();
  if (verifiedOnly) where.verified = true;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { skill: { contains: q, mode: 'insensitive' } },
      { technology: { contains: q, mode: 'insensitive' } }
    ];
  }
  return prisma.learningResource.findMany({ where, orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }] });
};

export const getResource = async (id) => {
  const resource = await prisma.learningResource.findUnique({ where: { id } });
  if (!resource) throw new ApiError(404, 'Resource not found.');
  return resource;
};

/** Creates or updates a bookmark. Idempotent per (user, resource). */
export const setBookmark = async (userId, resourceId, { completed } = {}) => {
  const resource = await prisma.learningResource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new ApiError(404, 'Resource not found.');

  const existing = await prisma.resourceBookmark.findUnique({
    where: { userId_resourceId: { userId, resourceId } }
  });
  if (existing && completed === undefined) {
    // Toggling off when called without an explicit state.
    await prisma.resourceBookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  const bookmark = await prisma.resourceBookmark.upsert({
    where: { userId_resourceId: { userId, resourceId } },
    create: { userId, resourceId, completed: Boolean(completed) },
    update: completed === undefined ? {} : { completed: Boolean(completed) }
  });
  return { bookmarked: true, completed: bookmark.completed };
};

export const listBookmarks = async (userId) =>
  prisma.resourceBookmark.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { resource: true }
  });

/**
 * Recommends resources based on the student's real signals: subjects/topics
 * they marked difficult and topics with low quiz accuracy. Matches are made
 * against resource skill/technology text. When nothing matches, verified
 * resources are returned rather than invented suggestions.
 */
export const recommendResources = async (userId, limit = 10) => {
  const [profile, weakAttempts] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.quizAttempt.findMany({
      where: { userId },
      include: { quiz: { select: { topicId: true } } }
    })
  ]);

  const signals = new Set();
  const difficult = Array.isArray(profile?.difficultAreas) ? profile.difficultAreas : [];
  for (const d of difficult) if (typeof d === 'string') signals.add(d.toLowerCase());
  // Weak topics: topics where accuracy < 50%.
  const perTopic = new Map();
  for (const a of weakAttempts) {
    const tid = a.quiz?.topicId;
    if (!tid || a.totalQuestions === 0) continue;
    const b = perTopic.get(tid) || { asked: 0, correct: 0 };
    b.asked += a.totalQuestions; b.correct += a.score || 0;
    perTopic.set(tid, b);
  }
  const weakTopicIds = [...perTopic.entries()].filter(([, b]) => b.correct / b.asked < 0.5).map(([id]) => id);
  if (weakTopicIds.length > 0) {
    const topics = await prisma.confirmedTopic.findMany({ where: { id: { in: weakTopicIds } }, select: { title: true } });
    for (const t of topics) signals.add(t.title.toLowerCase());
  }

  const signalList = [...signals].filter(Boolean);
  if (signalList.length === 0) {
    return prisma.learningResource.findMany({ where: { verified: true }, take: limit, orderBy: { createdAt: 'desc' } });
  }

  const matches = await prisma.learningResource.findMany({
    where: {
      verified: true,
      OR: signalList.flatMap((s) => [
        { skill: { contains: s, mode: 'insensitive' } },
        { technology: { contains: s, mode: 'insensitive' } },
        { title: { contains: s, mode: 'insensitive' } }
      ])
    },
    take: limit,
    orderBy: { createdAt: 'desc' }
  });
  return matches;
};

// ─── Admin management ────────────────────────────────────────────────────────
export const createResource = async (adminId, input) => {
  const title = norm(input.title, 200);
  const url = norm(input.url, 1000);
  if (!title || !url) throw new ApiError(400, 'A title and URL are required.');
  const level = norm(input.level, 20).toLowerCase();
  return prisma.learningResource.create({
    data: {
      title,
      url,
      skill: norm(input.skill, 80),
      technology: norm(input.technology, 80),
      level: LEVELS.has(level) ? level : 'beginner',
      projectType: norm(input.projectType, 80) || null,
      source: norm(input.source, 160) || null,
      description: norm(input.description, 2000) || null,
      createdByAdminId: adminId
    }
  });
};

export const verifyResource = async (id, verified) =>
  prisma.learningResource.update({ where: { id }, data: { verified: Boolean(verified) } });
