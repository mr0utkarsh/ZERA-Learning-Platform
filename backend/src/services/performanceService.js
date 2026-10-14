import { prisma } from '../config/prisma.js';

/**
 * Performance analysis (Feature 7).
 *
 * Every number here is derived from real stored events: quiz attempts (with
 * server-computed scores), completed study tasks, interview sessions, and
 * per-topic syllabus progress. Nothing is invented. When a student has no
 * activity yet, an explicit empty state is returned instead of zeros presented
 * as a score or a fabricated streak.
 */
export const getPerformance = async (userId) => {
  const [attempts, completedTasks, totalTasks, interviews, topicRows] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: 'asc' },
      include: { quiz: { select: { id: true, title: true, topicId: true } } }
    }),
    prisma.studyTask.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.studyTask.count({ where: { userId } }),
    prisma.interviewSession.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, role: true, score: true, createdAt: true }
    }),
    prisma.topicProgress.findMany({
      where: { userId },
      include: { topic: { select: { id: true, title: true } } }
    })
  ]);

  const hasActivity = attempts.length > 0 || completedTasks > 0 || interviews.length > 0 || topicRows.length > 0;
  if (!hasActivity) {
    return {
      hasData: false,
      message: 'No activity yet. Attempt a quiz, complete a study task, or update your syllabus progress to see analytics here.',
      methodology: 'Metrics are computed only from completed quizzes, finished study tasks, mock interviews, and topic progress you record.'
    };
  }

  // ── Quiz accuracy (real, server-scored) ──
  const scored = attempts.filter((a) => a.totalQuestions > 0);
  const totalCorrect = scored.reduce((sum, a) => sum + (a.score || 0), 0);
  const totalAsked = scored.reduce((sum, a) => sum + a.totalQuestions, 0);
  const quizAccuracy = totalAsked > 0 ? Math.round((totalCorrect / totalAsked) * 1000) / 10 : null;

  // ── Per-topic accuracy, joined through the quiz's confirmed topic ──
  const topicTitle = new Map(topicRows.map((r) => [r.topic.id, r.topic.title]));
  const perTopic = new Map(); // topicId -> { asked, correct }
  for (const a of scored) {
    const topicId = a.quiz?.topicId;
    if (!topicId) continue;
    const bucket = perTopic.get(topicId) || { asked: 0, correct: 0 };
    bucket.asked += a.totalQuestions;
    bucket.correct += a.score || 0;
    perTopic.set(topicId, bucket);
  }

  const topicStats = [...perTopic.entries()].map(([topicId, b]) => ({
    topicId,
    title: topicTitle.get(topicId) || 'Topic',
    accuracy: b.asked > 0 ? Math.round((b.correct / b.asked) * 1000) / 10 : null,
    attempts: b.asked
  }));

  const strengths = topicStats.filter((t) => t.accuracy !== null && t.accuracy >= 70);
  const needsAttention = topicStats.filter((t) => t.accuracy !== null && t.accuracy < 50);

  // Topics the student explicitly flagged for revision.
  const revisionTopics = topicRows
    .filter((r) => r.status === 'NEEDS_REVISION')
    .map((r) => ({ topicId: r.topic.id, title: r.topic.title, status: r.status }));

  // ── Progress over time (only when there is enough history) ──
  const timeline = scored.slice(-10).map((a) => ({
    at: a.startedAt,
    quizTitle: a.quiz?.title || 'Quiz',
    percentage: Math.round(((a.score || 0) / a.totalQuestions) * 1000) / 10
  }));
  const hasTrend = timeline.length >= 3;

  // ── Evidence-based recommendations ──
  const recommendations = [];
  if (needsAttention.length > 0) {
    recommendations.push(`Review ${needsAttention.map((t) => `"${t.title}"`).join(', ')} — recent quiz accuracy is below 50%.`);
  }
  if (revisionTopics.length > 0) {
    recommendations.push(`${revisionTopics.length} topic(s) are marked NEEDS_REVISION. Schedule a revision session for them.`);
  }
  if (quizAccuracy !== null && quizAccuracy < 60 && scored.length >= 2) {
    recommendations.push('Your overall quiz accuracy is under 60%. Try generating an easier quiz to rebuild fundamentals.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Keep going — attempt more quizzes to unlock targeted recommendations.');
  }

  return {
    hasData: true,
    methodology: 'Quiz accuracy = correct answers / total asked across your submitted attempts. Topic accuracy uses the same ratio per confirmed topic. Study-task completion uses tasks you marked COMPLETED. No scores are estimated.',
    quizzes: {
      attempted: attempts.length,
      averageAccuracy: quizAccuracy,
      hasTrend,
      timeline
    },
    studyTasks: { completed: completedTasks, total: totalTasks },
    interviews: { completed: interviews.length, recent: interviews.slice(0, 5) },
    syllabus: {
      completedTopics: topicRows.filter((r) => r.status === 'COMPLETED').length,
      inProgressTopics: topicRows.filter((r) => r.status === 'IN_PROGRESS').length,
      needsRevision: revisionTopics.length,
      trackedTopics: topicRows.length
    },
    strengths,
    needsAttention,
    revisionTopics,
    recommendations
  };
};
