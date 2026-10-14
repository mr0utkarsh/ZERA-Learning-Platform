import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres, resetDatabase } from './helpers/postgres.js';
import JSZip from 'jszip';

let pg;
let prisma;
let app;
let server;
let baseUrl;
let resetRateLimits;

const boundary = '----zeraTestBoundary7f3a91';

const readJson = async (res) => JSON.parse(await res.text());

const buildMultipart = (parts) => {
  const chunks = [];
  for (const part of parts) {
    chunks.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${part.name}"${part.filename ? `; filename="${part.filename}"` : ''}\r\n` +
      (part.contentType ? `Content-Type: ${part.contentType}\r\n` : '') +
      '\r\n'
    ));
    chunks.push(Buffer.isBuffer(part.value) ? part.value : Buffer.from(String(part.value)));
    chunks.push(Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
};

const postMultipart = (path, parts, token) => fetch(`${baseUrl}${path}`, {
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    // A throttled reply is sent with `Connection: close`. Without this,
    // undici reuses the socket the server is closing and reports a spurious
    // ECONNRESET instead of the 429.
    Connection: 'close',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  },
  body: buildMultipart(parts)
});

const makeDocx = async (text) => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
  zip.file('word/document.xml',
    '<?xml version="1.0"?><w:document xmlns:w="x"><w:body><w:p><w:r><w:t>' +
    text +
    '</w:t></w:r></w:p></w:body></w:document>');
  return zip.generateAsync({ type: 'nodebuffer' });
};

const register = async () => {
  const email = `up${Date.now()}${Math.random().toString(36).slice(2, 7)}@t.dev`;
  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Uploader', email, password: 'correct-horse-1' })
  });
  const text = await res.text();
  assert.equal(res.status, 201, text);
  return { email, token: JSON.parse(text).data.token };
};

before(async () => {
  pg = await startPostgres();
  process.env.DATABASE_URL = pg.url;
  process.env.DIRECT_URL = pg.url;
  process.env.JWT_SECRET = 'test-secret-not-a-public-default';
  process.env.SESSION_SECRET = 'test-session-secret-not-public';
  process.env.PASSWORD_RESET_TOKEN_SECRET = 'test-reset-secret-not-public';
  process.env.NODE_ENV = 'test';
  process.env.EMAIL_PROVIDER = '';

  ({ prisma } = await import('../src/config/prisma.js'));
  ({ resetRateLimits } = await import('../src/middleware/rateLimit.js'));
  app = (await import('../src/app.js')).default;

  await new Promise((resolve) => { server = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
  await pg.stop();
});

beforeEach(async () => {
  await resetDatabase(prisma);
  resetRateLimits();
});

describe('syllabus upload accepts real multipart bodies', () => {
  it('stores an uploaded DOCX and returns the extracted text', async () => {
    const { token, email } = await register();
    const docx = await makeDocx('Operating Systems syllabus unit one');

    const res = await postMultipart('/api/onboarding/syllabus', [
      { name: 'file', filename: 'syllabus.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', value: docx }
    ], token);

    assert.equal(res.status, 201);
    const body = await readJson(res);
    assert.equal(body.success, true);
    assert.equal(body.data.fileName, 'syllabus.docx');
    assert.equal(body.data.analysisStatus, 'EXTRACTED');
    assert.ok(body.data.analysis.suggestedTopics.join(' ').includes('Operating Systems'),
      `suggested topics look wrong: ${JSON.stringify(body.data.analysis)}`);

    // The bytes must actually be persisted, not just acknowledged.
    const row = await prisma.syllabusUpload.findFirst({ orderBy: { createdAt: 'desc' } });
    assert.ok(row, 'a SyllabusUpload row exists');
    assert.equal(row.fileName, 'syllabus.docx');
    assert.match(row.extractedText, /Operating Systems/);
    assert.ok(row.sizeBytes > 100, `sizeBytes looks wrong: ${row.sizeBytes}`);
    assert.equal(row.analysisStatus, 'EXTRACTED');
    assert.equal(row.userId, (await prisma.user.findUnique({ where: { email } })).id, 'upload is attributed to the uploader');
  });

  it('stores a plain text syllabus', async () => {
    const { token } = await register();
    const res = await postMultipart('/api/onboarding/syllabus', [
      { name: 'file', filename: 'syllabus.txt', contentType: 'text/plain', value: 'DBMS syllabus week 1' }
    ], token);

    assert.equal(res.status, 201);
    const body = await readJson(res);
    assert.equal(body.data.fileName, 'syllabus.txt');
    assert.ok(body.data.analysis.suggestedTopics.join(' ').includes('DBMS'));
  });

  it('rejects an upload with no file part', async () => {
    const { token } = await register();
    const res = await postMultipart('/api/onboarding/syllabus', [
      { name: 'note', value: 'no file here' }
    ], token);
    assert.equal(res.status, 400);
  });

  it('rejects a fake DOCX that is really plain text', async () => {
    const { token } = await register();
    const res = await postMultipart('/api/onboarding/syllabus', [
      { name: 'file', filename: 'syllabus.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', value: 'this is not a zip archive at all' }
    ], token);
    assert.equal(res.status, 400);
    assert.equal(await prisma.syllabusUpload.count(), 0, 'a rejected file must not be persisted');
  });

  it('rejects a request that is not multipart at all', async () => {
    const { token } = await register();
    const res = await fetch(`${baseUrl}/api/onboarding/syllabus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ filename: 'x.txt' })
    });
    assert.equal(res.status, 400);
  });

  it('requires authentication', async () => {
    const res = await postMultipart('/api/onboarding/syllabus', [
      { name: 'file', filename: 'a.txt', contentType: 'text/plain', value: 'anonymous upload attempt' }
    ]);
    assert.equal(res.status, 401);
    assert.equal(await prisma.syllabusUpload.count(), 0);
  });

  it('enforces the size ceiling instead of buffering everything', async () => {
    const { token } = await register();
    const oversized = Buffer.alloc(11 * 1024 * 1024, 0x41);
    const res = await postMultipart('/api/onboarding/syllabus', [
      { name: 'file', filename: 'huge.txt', contentType: 'text/plain', value: oversized }
    ], token);
    assert.ok(res.status === 413 || res.status === 400, `expected a rejection, got ${res.status}`);
    assert.equal(await prisma.syllabusUpload.count(), 0);
  });

  it('throttles repeated uploads from one account', async () => {
    const { token } = await register();
    const statuses = [];
    for (let i = 0; i < 24; i += 1) {
      const res = await postMultipart('/api/onboarding/syllabus', [
        { name: 'file', filename: `s${i}.txt`, contentType: 'text/plain', value: `syllabus number ${i}` }
      ], token);
      statuses.push(res.status);
      if (res.status === 429) break;
    }

    assert.ok(statuses.includes(429), `upload flood was never throttled: ${statuses.join(',')}`);
  });
});

describe('progress is reachable through the HTTP API', () => {
  const seedCatalog = async () => {
    const course = await prisma.course.create({ data: { title: 'CS Core', slug: `cs-${Date.now()}`, isPublished: true } });
    const subject = await prisma.subject.create({ data: { title: 'OS', courseId: course.id, sequence: 1 } });
    const unit = await prisma.unit.create({ data: { title: 'Unit 1', subjectId: subject.id, sequence: 1 } });
    const chapter = await prisma.chapter.create({ data: { title: 'Chapter 1', unitId: unit.id, sequence: 1 } });
    const topic = await prisma.topic.create({ data: { title: 'Processes', chapterId: chapter.id, sequence: 1 } });
    const lessons = [];
    for (let i = 1; i <= 3; i += 1) {
      lessons.push(await prisma.lesson.create({ data: { title: `Lesson ${i}`, sequence: i, topicId: topic.id } }));
    }
    return { course, lessons };
  };

  const api = (path, token, method = 'GET') => fetch(`${baseUrl}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  it('reflects a real lesson completion in the progress endpoint', async () => {
    const { token, email } = await register();
    const { course, lessons } = await seedCatalog();

    const before = await readJson(await api(`/api/courses/${course.id}/progress`, token));
    assert.equal(before.data.progress.completionPercentage, 0);
    assert.deepEqual(before.data.completedLessonIds, []);
    assert.equal(before.data.progress.totalLessons, 3, 'the endpoint derives a real denominator');

    const completed = await api(`/api/courses/${course.id}/lessons/${lessons[0].id}/complete`, token, 'POST');
    assert.equal(completed.status, 200);

    const after = await readJson(await api(`/api/courses/${course.id}/progress`, token));
    assert.deepEqual(after.data.completedLessonIds, [lessons[0].id]);
    assert.equal(after.data.progress.completedLessons, 1);
    assert.equal(after.data.progress.completionPercentage, 33);
    assert.equal(after.data.progress.status, 'IN_PROGRESS');

    // And it is not just a response echo: the completion survives a re-read.
    const reread = await readJson(await api(`/api/courses/${course.id}/progress`, token));
    assert.deepEqual(reread.data.completedLessonIds, [lessons[0].id]);

    const user = await prisma.user.findUnique({ where: { email } });
    const row = await prisma.lessonCompletion.findFirst({ where: { userId: user.id, lessonId: lessons[0].id } });
    assert.ok(row, 'LessonCompletion persisted in the database');
  });

  it('refuses to complete a lesson for another user', async () => {
    const a = await register();
    const b = await register();
    const { course, lessons } = await seedCatalog();

    // B completes a lesson; that must not credit A's progress.
    const res = await api(`/api/courses/${course.id}/lessons/${lessons[0].id}/complete`, b.token, 'POST');
    assert.equal(res.status, 200);

    const aProgress = await readJson(await api(`/api/courses/${course.id}/progress`, a.token));
    const bProgress = await readJson(await api(`/api/courses/${course.id}/progress`, b.token));

    assert.deepEqual(aProgress.data.completedLessonIds, [], "one user's completion must not land on another user");
    assert.deepEqual(bProgress.data.completedLessonIds, [lessons[0].id], 'the completing user keeps their own credit');
  });

  it('blocks anonymous access to course progress', async () => {
    const { course } = await seedCatalog();
    assert.equal((await api(`/api/courses/${course.id}/progress`)).status, 401);
    assert.equal((await api(`/api/courses/${course.id}/progress`, 'garbage.token.here')).status, 401);
  });
});
