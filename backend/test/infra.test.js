import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres, resetDatabase } from './helpers/postgres.js';

let pg;
let prisma;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

const makeUser = async () =>
  prisma.user.create({ data: { name: 'S', email: `s${Date.now()}-${Math.random().toString(36).slice(2)}@t.dev`, passwordHash: 'x' } });

before(async () => {
  pg = await startPostgres();
  process.env.DATABASE_URL = pg.url;
  process.env.DIRECT_URL = pg.url;
  // Force the "not configured" paths so tests assert honest degradation and make
  // no real network calls. Setting to '' stops dotenv from repopulating them.
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OCR_PROVIDER', 'OCR_API_URL', 'BREVO_API_KEY']) {
    process.env[k] = '';
  }
  ({ prisma } = await import('../src/config/prisma.js'));
});
after(async () => { await prisma.$disconnect(); await pg.stop(); });

describe('infrastructure services degrade honestly when unconfigured', () => {
  it('storage reports unconfigured and refuses to upload', async () => {
    const { storageService } = await import('../src/services/storageService.js');
    assert.equal(storageService.isConfigured(), false);
    await assert.rejects(() => storageService.upload({ bucket: 'b', path: 'p', bytes: PNG }), (e) => e.statusCode === 503);
  });

  it('Brevo refuses to send when no API key is set', async () => {
    const { brevoService } = await import('../src/services/brevoService.js');
    assert.equal(brevoService.isConfigured(), false);
    await assert.rejects(() => brevoService.sendSms({ recipient: '+910000000000', content: 'hi' }), (e) => e.statusCode === 503);
    await assert.rejects(() => brevoService.sendEmail({ to: 'a@b.com', subject: 's' }), (e) => e.statusCode === 503);
  });

  it('OCR refuses to extract when no provider is configured', async () => {
    const { ocrService } = await import('../src/services/ocrService.js');
    assert.equal(ocrService.isConfigured(), false);
    await assert.rejects(() => ocrService.extractText({ bytes: PNG }), (e) => e.statusCode === 503);
  });
});

describe('handwriting upload validates and records OCR status honestly', () => {
  it('rejects a non-image file', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { uploadHandwriting } = await import('../src/services/handwritingService.js');
    await assert.rejects(
      () => uploadHandwriting(user.id, { bytes: Buffer.from('not an image'), mimeType: 'image/png', fileName: 'x.png' }),
      /Unsupported scan/
    );
  });

  it('stores the note and marks OCR as SKIPPED (not fabricated) when unconfigured', async () => {
    await resetDatabase(prisma);
    const user = await makeUser();
    const { uploadHandwriting, correctOcrText, getHandwriting } = await import('../src/services/handwritingService.js');
    const note = await uploadHandwriting(user.id, { bytes: PNG, mimeType: 'image/png', fileName: 'notes.png', title: 'Lecture 1' });
    assert.equal(note.ocrStatus, 'SKIPPED');
    assert.match(note.ocrError, /OCR is not configured/);
    assert.equal(note.storagePath, null, 'no image persisted when storage is unconfigured');

    const corrected = await correctOcrText(user.id, note.id, 'Student typed the text they can read.');
    assert.equal(corrected.correctedText, 'Student typed the text they can read.');
  });

  it('does not expose another user\'s handwritten note', async () => {
    await resetDatabase(prisma);
    const owner = await makeUser();
    const other = await makeUser();
    const { uploadHandwriting, getHandwriting } = await import('../src/services/handwritingService.js');
    const note = await uploadHandwriting(owner.id, { bytes: PNG, mimeType: 'image/png', fileName: 'n.png' });
    await assert.rejects(() => getHandwriting(other.id, note.id), /Handwritten note not found/);
  });
});
