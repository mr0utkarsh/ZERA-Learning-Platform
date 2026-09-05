import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import { request, app, prisma, bcrypt, signupStudent } from './helpers.mjs';

const require = createRequire(import.meta.url);
const aiConfigService = require('../src/services/aiConfigService');
const ai = require('../src/ai');

// Admin Panel → Settings → API Configuration (SUPER_ADMIN only).
// Contract under test:
//  - super-admin-only access (server-side); plain ADMIN and students denied
//  - keys stored ENCRYPTED (plaintext never in the DB row)
//  - GET responses only ever contain masked keys
//  - validation: provider must be known; active provider needs its key
//  - env fallback when no admin settings exist
// NOTE: afterAll wipes all admin settings so later suites (ai-guards) still
// see an unconfigured AI.
const ADMIN_EMAIL = 'admin-settings@zera.local';
const FAKE_GROQ_KEY = 'gsk_fakeTestKey0123456789ABCDEF';
const FAKE_GEMINI_KEY = 'AIzaFakeGeminiKey0123456789ABCDEFG';

describe('Admin settings (API configuration)', () => {
  let adminAgent;
  let studentAgent;

  beforeAll(async () => {
    await prisma.adminSetting.deleteMany({});
    aiConfigService.invalidateCache();

    await prisma.user.create({
      data: {
        name: 'Settings Super Admin', email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash('AdminPass123', 12),
        role: 'SUPER_ADMIN', emailVerified: true,
      },
    });
    adminAgent = request.agent(app);
    await adminAgent.post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'AdminPass123' });

    studentAgent = request.agent(app);
    await signupStudent(studentAgent);
  });

  afterAll(async () => {
    await prisma.adminSetting.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, 'plain-admin-settings@zera.local'] } } });
    aiConfigService.invalidateCache();
    await prisma.$disconnect();
  });

  it('starts on the environment fallback (source=env, not configured)', async () => {
    const res = await adminAgent.get('/api/admin/settings');
    expect(res.status).toBe(200);
    expect(res.body.data.settings.source).toBe('env');
    expect(res.body.data.settings.configured).toBe(false);
  });

  it('blocks students and plain admins from reading and writing settings', async () => {
    expect((await studentAgent.get('/api/admin/settings')).status).toBe(403);
    expect((await studentAgent.put('/api/admin/settings').send({ provider: 'none' })).status).toBe(403);

    // A regular ADMIN (not SUPER_ADMIN) must also be denied.
    await prisma.user.create({
      data: {
        name: 'Plain Admin', email: 'plain-admin-settings@zera.local',
        passwordHash: await bcrypt.hash('AdminPass123', 12),
        role: 'ADMIN', emailVerified: true,
      },
    });
    const plainAdmin = request.agent(app);
    await plainAdmin.post('/api/auth/login').send({ email: 'plain-admin-settings@zera.local', password: 'AdminPass123' });
    expect((await plainAdmin.get('/api/admin/settings')).status).toBe(403);
    expect((await plainAdmin.put('/api/admin/settings').send({ provider: 'none' })).status).toBe(403);
  });

  it('rejects unknown providers and a provider without its key', async () => {
    let res = await adminAgent.put('/api/admin/settings').send({ provider: 'anthropic' });
    expect(res.status).toBe(400);

    res = await adminAgent.put('/api/admin/settings').send({ provider: 'groq' }); // no groq key stored yet
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/api key/i);
  });

  it('saves keys + provider; GET returns masked keys only', async () => {
    const res = await adminAgent.put('/api/admin/settings').send({
      provider: 'groq',
      keys: { groq: FAKE_GROQ_KEY, gemini: FAKE_GEMINI_KEY },
    });
    expect(res.status).toBe(200);
    const s = res.body.data.settings;
    expect(s.source).toBe('admin');
    expect(s.provider).toBe('groq');
    expect(s.configured).toBe(true);
    expect(s.keys.groq.set).toBe(true);
    expect(s.keys.gemini.set).toBe(true);
    expect(s.keys.openai.set).toBe(false);

    // Full keys must never appear in any response body.
    const bodyText = JSON.stringify(res.body);
    expect(bodyText).not.toContain(FAKE_GROQ_KEY);
    expect(bodyText).not.toContain(FAKE_GEMINI_KEY);
    // Masked form only (first few + last few chars).
    expect(s.keys.groq.masked).toContain('…');
    expect(s.keys.groq.masked.length).toBeLessThan(FAKE_GROQ_KEY.length - 8);
  });

  it('stores keys encrypted — plaintext never in the database row', async () => {
    const row = await prisma.adminSetting.findUnique({ where: { key: 'ai.keys' } });
    expect(row).toBeTruthy();
    expect(row.value).not.toContain(FAKE_GROQ_KEY);
    expect(row.value).not.toContain(FAKE_GEMINI_KEY);
    expect(row.value.startsWith('enc:v1:')).toBe(true);
  });

  it('the facade sees the admin-configured provider as active', async () => {

    expect(await ai.isConfigured()).toBe(true);
  });

  it('keeps stored keys when saving without them; removes on request', async () => {
    // Saving with only provider/model keeps keys untouched.
    let res = await adminAgent.put('/api/admin/settings').send({ provider: 'gemini', model: 'gemini-2.5-flash' });
    expect(res.status).toBe(200);
    expect(res.body.data.settings.provider).toBe('gemini');
    expect(res.body.data.settings.keys.groq.set).toBe(true);
    expect(res.body.data.settings.keys.gemini.set).toBe(true);

    // Explicit removal clears the gemini key; switching back to gemini must now fail.
    res = await adminAgent.put('/api/admin/settings').send({ provider: 'groq', removeKeys: ['gemini'] });
    expect(res.status).toBe(200);
    expect(res.body.data.settings.keys.gemini.set).toBe(false);

    res = await adminAgent.put('/api/admin/settings').send({ provider: 'gemini' });
    expect(res.status).toBe(400);
  });

  it('admin can disable AI again (provider none)', async () => {
    const res = await adminAgent.put('/api/admin/settings').send({ provider: 'none' });
    expect(res.status).toBe(200);
    expect(res.body.data.settings.configured).toBe(false);

    expect(await ai.isConfigured()).toBe(false);
  });
});
