import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres, resetDatabase } from './helpers/postgres.js';

let pg;
let prisma;

const makeUser = async () =>
  prisma.user.create({
    data: { name: 'Student', email: `s${Date.now()}-${Math.random().toString(36).slice(2)}@t.dev`, passwordHash: 'x' }
  });

// A sample student-confirmed syllabus: 1 subject -> 1 unit -> 3 topics.
const sampleConfirm = () => ({
  courseName: 'B.Tech CSE',
  semester: 'Semester 5',
  subjects: [
    {
      title: 'Operating Systems',
      units: [
        {
          title: 'Unit 1 - Processes',
          topics: [
            { title: 'Processes' },
            { title: 'Threads', difficulty: 'medium' },
            { title: 'Scheduling' }
          ]
        }
      ]
    }
  ]
});

before(async () => {
  pg = await startPostgres();
  process.env.DATABASE_URL = pg.url;
  process.env.DIRECT_URL = pg.url;
  ({ prisma } = await import('../src/config/prisma.js'));
});

after(async () => {
  await prisma.$disconnect();
  await pg.stop();
});

describe('confirmed syllabus persists exactly what the student confirmed', () => {
  it('stores the hierarchy verbatim and links the source upload', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const upload = await prisma.syllabusUpload.create({
      data: { userId: user.id, fileName: 'syllabus.pdf', extractedText: 'dummy text' }
    });

    const { saveConfirmedSyllabus } = await import('../src/services/confirmedSyllabusService.js');
    const saved = await saveConfirmedSyllabus(user.id, { ...sampleConfirm(), uploadId: upload.id });

    assert.equal(saved.courseName, 'B.Tech CSE');
    assert.equal(saved.subjects.length, 1);
    assert.equal(saved.subjects[0].units.length, 1);
    assert.equal(saved.subjects[0].units[0].topics.length, 3);
    assert.equal(saved.subjects[0].units[0].topics[1].difficulty, 'medium');

    const refreshed = await prisma.syllabusUpload.findUnique({ where: { id: upload.id } });
    assert.equal(refreshed.confirmed, true, 'source upload is marked confirmed');
  });

  it('rejects an empty subject list rather than inventing content', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { saveConfirmedSyllabus } = await import('../src/services/confirmedSyllabusService.js');
    await assert.rejects(
      () => saveConfirmedSyllabus(user.id, { courseName: 'X', subjects: [] }),
      /at least one subject/
    );
  });

  it('does not return another user\'s syllabus', async () => {
    await resetDatabase(prisma);
    const owner = await makeUser();
    const other = await makeUser();
    const { saveConfirmedSyllabus, getConfirmedSyllabus } = await import('../src/services/confirmedSyllabusService.js');
    const saved = await saveConfirmedSyllabus(owner.id, sampleConfirm());

    await assert.rejects(
      () => getConfirmedSyllabus(other.id, saved.id),
      /Syllabus not found/
    );
  });
});

describe('syllabus progress uses a consistent documented formula', () => {
  const seed = async () => {
    const user = await makeUser();
    const { saveConfirmedSyllabus } = await import('../src/services/confirmedSyllabusService.js');
    const saved = await saveConfirmedSyllabus(user.id, sampleConfirm());
    const topicIds = saved.subjects[0].units[0].topics.map((t) => t.id);
    return { user, syllabus: saved, topicIds };
  };

  it('reports 0% when nothing is started and 100% when all completed', async () => {
    await resetDatabase(prisma);
    const { user, syllabus, topicIds } = await seed();
    const { getSyllabusProgress, setTopicStatus } = await import('../src/services/progressService.js');

    const start = await getSyllabusProgress(user.id, syllabus.id);
    assert.equal(start.overallPercentage, 0);
    assert.equal(start.totalTopics, 3);

    for (const id of topicIds) await setTopicStatus(user.id, id, 'COMPLETED');
    const done = await getSyllabusProgress(user.id, syllabus.id);
    assert.equal(done.overallPercentage, 100);
    assert.equal(done.completedTopics, 3);
  });

  it('weights IN_PROGRESS and NEEDS_REVISION as half, and never double-counts', async () => {
    await resetDatabase(prisma);
    const { user, syllabus, topicIds } = await seed();
    const { getSyllabusProgress, setTopicStatus } = await import('../src/services/progressService.js');

    await setTopicStatus(user.id, topicIds[0], 'COMPLETED'); // 1.0
    await setTopicStatus(user.id, topicIds[1], 'IN_PROGRESS'); // 0.5
    // topicIds[2] stays NOT_STARTED (0)
    const snap = await getSyllabusProgress(user.id, syllabus.id);
    assert.equal(snap.overallPercentage, 50, '1.5 / 3 = 50%');

    // Re-setting the same topic must not create a second progress row.
    await setTopicStatus(user.id, topicIds[0], 'COMPLETED');
    const rows = await prisma.topicProgress.count({ where: { userId: user.id, topicId: topicIds[0] } });
    assert.equal(rows, 1, 'one progress row per topic');
  });

  it('rejects updating a topic owned by another user (cross-user isolation)', async () => {
    await resetDatabase(prisma);
    const { user, topicIds } = await seed();
    const other = await makeUser();
    const { setTopicStatus } = await import('../src/services/progressService.js');
    await assert.rejects(
      () => setTopicStatus(other.id, topicIds[0], 'COMPLETED'),
      /Topic not found/
    );
  });

  it('is idempotent when initialising progress rows', async () => {
    await resetDatabase(prisma);
    const { user, syllabus } = await seed();
    const { ensureProgressForSyllabus } = await import('../src/services/progressService.js');
    const first = await ensureProgressForSyllabus(user.id, syllabus.id);
    const second = await ensureProgressForSyllabus(user.id, syllabus.id);
    assert.equal(first, 3);
    assert.equal(second, 0, 'second run creates nothing new');
  });
});
