import { PrismaClient } from '@prisma/client';
import { startPostgres } from './postgres.js';

const pg = await startPostgres();
const prisma = new PrismaClient({ datasources: { db: { url: pg.url } } });
try {
  const version = await prisma.$queryRawUnsafe('select version()');
  console.log('PRISMA_VERSION:', version[0].version.split(' on ')[0]);

  const roles = await prisma.$queryRawUnsafe(
    `select t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder) as v
     from pg_type t join pg_enum e on e.enumtypid = t.oid
     where t.typname in ('Role','InviteStatus','AnalysisStatus','ActivityType')
     group by t.typname order by t.typname`
  );
  for (const r of roles) console.log(`ENUM ${r.typname} = ${r.v}`);

  const user = await prisma.user.create({
    data: { id: 'u_root', name: 'Root', email: 'root@zera.dev', passwordHash: 'x', role: 'SUPER_ADMIN' },
  });
  console.log('USER_CREATED role=' + user.role);

  const invite = await prisma.adminInvite.create({
    data: { email: 'admin@zera.dev', name: 'Admin', role: 'ADMIN', invitedById: user.id },
  });
  console.log('INVITE_CREATED status=' + invite.status + ' role=' + invite.role);

  const course = await prisma.course.create({
    data: { title: 'Maths', slug: 'maths', isPublished: true },
  });
  const subject = await prisma.subject.create({
    data: { title: 'Algebra', courseId: course.id, sequence: 0 },
  });
  const unit = await prisma.unit.create({
    data: { title: 'Unit 1', subjectId: subject.id, sequence: 0 },
  });
  const chapter = await prisma.chapter.create({
    data: { title: 'Chapter 1', unitId: unit.id, sequence: 0 },
  });
  const topic = await prisma.topic.create({
    data: { title: 'Linear Equations', chapterId: chapter.id, sequence: 0 },
  });
  const lesson = await prisma.lesson.create({
    data: { title: 'L1', sequence: 1, topicId: topic.id },
  });
  console.log('COURSE_TREE_CREATED course=' + course.id + ' lesson=' + lesson.id);

  const upload = await prisma.syllabusUpload.create({
    data: { fileName: 'syllabus.pdf', mimeType: 'application/pdf', sizeBytes: 2048, extractedText: 'text', userId: user.id, analysisStatus: 'EXTRACTED' },
  });
  console.log('UPLOAD_CREATED status=' + upload.analysisStatus + ' size=' + upload.sizeBytes);

  const completion = await prisma.lessonCompletion.create({
    data: { userId: user.id, lessonId: lesson.id, courseId: course.id },
  });
  console.log('LESSON_COMPLETION_CREATED ' + completion.id);

  const log = await prisma.activityLog.create({
    data: { userId: user.id, courseId: course.id, type: 'LESSON_COMPLETED' },
  });
  console.log('ACTIVITY_LOG_CREATED type=' + log.type);

  const task = await prisma.studyPlan.create({
    data: {
      userId: user.id,
      courseId: course.id,
      title: 'Week 1',
      schedule: [1, 2],
      tasks: { create: { title: 'Read chapter 1', userId: user.id, sequence: 0 } },
    },
    include: { tasks: true },
  });
  console.log('STUDY_PLAN_CREATED tasks=' + task.tasks.length + ' first=' + task.tasks[0].title);

  // Cascade check: deleting the course must remove dependent rows.
  await prisma.course.delete({ where: { id: course.id } });
  const lessonsLeft = await prisma.lesson.count();
  const compsLeft = await prisma.lessonCompletion.count();
  console.log('CASCADE after course delete: lessons=' + lessonsLeft + ' completions=' + compsLeft);
  const plansLeft = await prisma.studyPlan.count();
  console.log('CASCADE studyPlan (expect 0 via user? no, user still exists): ' + plansLeft);

  // Deleting the user must cascade invites, uploads, logs.
  await prisma.user.delete({ where: { id: user.id } });
  const invLeft = await prisma.adminInvite.count();
  const upLeft = await prisma.syllabusUpload.count();
  const logLeft = await prisma.activityLog.count();
  const taskLeft = await prisma.studyTask.count();
  console.log('CASCADE after user delete: invites=' + invLeft + ' uploads=' + upLeft + ' logs=' + logLeft + ' tasks=' + taskLeft);

  console.log('RESULT: ALL PRISMA CLIENT OPERATIONS SUCCEEDED');
} catch (err) {
  console.log('RESULT: FAILED -> ' + err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pg.stop();
}
