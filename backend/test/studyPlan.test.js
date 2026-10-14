import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres, resetDatabase } from './helpers/postgres.js';

let pg;
let prisma;

const makeUser = async () =>
  prisma.user.create({ data: { name: 'S', email: `s${Date.now()}-${Math.random().toString(36).slice(2)}@t.dev`, passwordHash: 'x' } });

const seedSyllabus = async (user) => {
  const { saveConfirmedSyllabus } = await import('../src/services/confirmedSyllabusService.js');
  return saveConfirmedSyllabus(user.id, {
    courseName: 'B.Tech CSE',
    subjects: [{
      title: 'DBMS',
      units: [{
        title: 'Unit 1',
        topics: [
          { title: 'Normalization', difficulty: 'hard' },
          { title: 'ER Model', difficulty: 'easy' },
          { title: 'Transactions', needsRevision: true }
        ]
      }]
    }]
  });
};

before(async () => {
  pg = await startPostgres();
  process.env.DATABASE_URL = pg.url;
  process.env.DIRECT_URL = pg.url;
  ({ prisma } = await import('../src/config/prisma.js'));
});
after(async () => { await prisma.$disconnect(); await pg.stop(); });

describe('academic onboarding is skip-friendly and normalized', () => {
  it('persists a partial profile and normalizes unknown enums to null', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { saveAcademicProfile } = await import('../src/services/academicService.js');
    const profile = await saveAcademicProfile(user.id, {
      educationLevel: 'undergraduate',
      courseProgram: 'B.Tech CSE',
      subjects: ['DBMS', 'OS'],
      studyTimePref: 'not-a-real-time',
      dailyMinutes: 90
    });
    assert.equal(profile.educationLevel, 'undergraduate');
    assert.deepEqual(profile.subjects, ['DBMS', 'OS']);
    assert.equal(profile.studyTimePref, null, 'invalid enum normalized to null, not guessed');
    assert.equal(profile.dailyMinutes, 90);
  });
});

describe('study plan engine references real topics and tracks completion', () => {
  it('builds a RULE_BASED plan whose tasks reference real topics', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const syllabus = await seedSyllabus(user);
    const { generateStudyPlan } = await import('../src/services/studyPlanService.js');
    const plan = await generateStudyPlan(user.id, { syllabusId: syllabus.id });

    assert.equal(plan.generator, 'RULE_BASED', 'no AI configured -> honestly labelled rule-based');
    assert.ok(plan.tasks.length >= 3, 'at least one study session per topic');

    const realTopicIds = new Set(syllabus.subjects[0].units[0].topics.map((t) => t.id));
    for (const task of plan.tasks) {
      assert.ok(realTopicIds.has(task.topicId), 'every task references a real confirmed topic');
    }
    // The needs-revision topic has the highest priority, so it is scheduled first.
    const firstStudy = plan.tasks.find((t) => t.kind === 'STUDY');
    assert.match(firstStudy.title, /Transactions/, 'highest-priority topic scheduled first');
  });

  it('recalculates remaining work after completing and skipping tasks', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const syllabus = await seedSyllabus(user);
    const { generateStudyPlan, completeTask, skipTask, planSummary } = await import('../src/services/studyPlanService.js');
    const plan = await generateStudyPlan(user.id, { syllabusId: syllabus.id });

    const total = plan.tasks.length;
    await completeTask(user.id, plan.tasks[0].id);
    await skipTask(user.id, plan.tasks[1].id);
    const sum = await planSummary(user.id, plan.id);

    assert.equal(sum.total, total);
    assert.equal(sum.completed, 1);
    assert.equal(sum.skipped, 1);
    assert.equal(sum.pending, total - 2);

    const completed = await prisma.studyTask.findUnique({ where: { id: plan.tasks[0].id } });
    assert.equal(completed.status, 'COMPLETED');
    assert.equal(completed.isCompleted, true);
  });

  it('rejects task operations for another user (ownership)', async () => {
    await resetDatabase(prisma);
    const owner = await makeUser();
    const other = await makeUser();
    const syllabus = await seedSyllabus(owner);
    const { generateStudyPlan, completeTask } = await import('../src/services/studyPlanService.js');
    const plan = await generateStudyPlan(owner.id, { syllabusId: syllabus.id });
    await assert.rejects(() => completeTask(other.id, plan.tasks[0].id), /Task not found/);
  });
});
