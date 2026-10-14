import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres, resetDatabase } from './helpers/postgres.js';

let pg;
let prisma;
let app;
let server;
let baseUrl;
let resetRateLimits;

const request = async (path, { method = 'GET', token, body, headers = {} } = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON response */ }
  return { status: res.status, json, text, headers: res.headers };
};

const makeUser = async ({ email, password, role = 'STUDENT' }) => {
  const bcrypt = (await import('bcryptjs')).default;
  return prisma.user.create({
    data: {
      name: 'Test User',
      email,
      passwordHash: await bcrypt.hash(password, 4),
      role,
      profile: { create: {} }
    }
  });
};

const login = async (email, password) => {
  // The login limiter is shared process state; clear it so each test starts
  // from a clean budget instead of inheriting the previous test's requests.
  resetRateLimits();
  const res = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(res.status, 200, `login failed: ${res.text}`);
  return res.json.data.token;
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
  app = (await import('../src/app.js')).default;
  ({ resetRateLimits } = await import('../src/middleware/rateLimit.js'));

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
  await pg.stop();
});

describe('authentication and authorization', () => {
  it('registers a student and returns a usable token', async () => {
    await resetDatabase(prisma);
    const email = `reg${Date.now()}@t.dev`;
    const res = await request('/api/auth/signup', {
      method: 'POST',
      body: { name: 'New Student', email, password: 'correct-horse-1' }
    });
    assert.equal(res.status, 201, res.text);
    assert.equal(res.json.data.user.role, 'STUDENT');
    assert.ok(res.json.data.user.passwordHash === undefined, 'passwordHash must never be returned');

    const me = await request('/api/auth/me', { token: res.json.data.token });
    assert.equal(me.status, 200);
    assert.equal(me.json.data.email, email);
  });

  it('rejects a duplicate email', async () => {
    await resetDatabase(prisma);
    const email = `dup${Date.now()}@t.dev`;
    await request('/api/auth/signup', { method: 'POST', body: { name: 'First Name', email, password: 'correct-horse-1' } });
    const res = await request('/api/auth/signup', { method: 'POST', body: { name: 'Second Name', email, password: 'correct-horse-1' } });
    assert.equal(res.status, 409);
  });

  it('rejects a wrong password without revealing whether the account exists', async () => {
    await resetDatabase(prisma);
    const email = `bad${Date.now()}@t.dev`;
    await request('/api/auth/signup', { method: 'POST', body: { name: 'Valid Name', email, password: 'correct-horse-1' } });

    const wrongPassword = await request('/api/auth/login', { method: 'POST', body: { email, password: 'wrong-pass-999' } });
    const noSuchUser = await request('/api/auth/login', { method: 'POST', body: { email: `ghost${Date.now()}@t.dev`, password: 'wrong-pass-999' } });

    assert.equal(wrongPassword.status, 401);
    assert.equal(noSuchUser.status, 401);
    assert.equal(wrongPassword.json.message, noSuchUser.json.message, 'identical message prevents user enumeration');
  });

  it('refuses requests with no token', async () => {
    const res = await request('/api/dashboard');
    assert.equal(res.status, 401);
  });

  it('refuses a tampered token', async () => {
    const res = await request('/api/dashboard', { token: 'not.a.jwt' });
    assert.equal(res.status, 401);
  });

  it('blocks students from admin routes', async () => {
    await resetDatabase(prisma);
    const email = `stu${Date.now()}@t.dev`;
    await makeUser({ email, password: 'correct-horse-1' });
    const token = await login(email, 'correct-horse-1');

    for (const [method, path] of [
      ['GET', '/api/admin/users'],
      ['GET', '/api/admin/stats'],
      ['POST', '/api/admin/invites'],
      ['GET', '/api/admin/invites']
    ]) {
      const res = await request(path, { method, token, body: method === 'POST' ? { name: 'X', email: `x${Date.now()}@t.dev` } : undefined });
      assert.equal(res.status, 403, `${method} ${path} should be 403, got ${res.status}`);
    }
  });

  it('blocks a student from mutating the course catalog', async () => {
    await resetDatabase(prisma);
    const email = `seed${Date.now()}@t.dev`;
    await makeUser({ email, password: 'correct-horse-1' });
    const token = await login(email, 'correct-horse-1');

    const res = await request('/api/initialize-catalog', { method: 'POST', token });
    assert.equal(res.status, 403, 'unauthenticated/prisma seeding must not be open to students');
  });

  it('rejects anonymous catalog seeding', async () => {
    const res = await request('/api/initialize-catalog', { method: 'POST' });
    assert.equal(res.status, 401);
  });

  it('does not leak internal error text on a 500', async () => {
    // A malformed ObjectId reaches the driver and produces a 500.
    const res = await request('/api/student/notes', {
      method: 'POST',
      body: { content: 'x' }
    });
    assert.ok(res.status >= 400);
    if (res.status >= 500) {
      assert.equal(res.json.message, 'Internal server error');
    }
  });
});

describe('abuse protection', () => {
  it('throttles repeated failed logins and then stops answering', async () => {
    await resetDatabase(prisma);
    resetRateLimits();
    const email = `brute${Date.now()}@t.dev`;
    await makeUser({ email, password: 'correct-horse-1' });

    const statuses = [];
    for (let i = 0; i < 14; i += 1) {
      const res = await request('/api/auth/login', { method: 'POST', body: { email, password: `wrong-${i}-pass` } });
      statuses.push(res.status);
      if (res.status === 429) {
        assert.ok(res.headers.get('Retry-After'), '429 advertises Retry-After');
        assert.equal(res.json.success, false);
        break;
      }
    }

    assert.ok(statuses.includes(429), `login was never throttled: ${statuses.join(',')}`);

    // Even the correct password must not get through while the window is closed.
    const correct = await request('/api/auth/login', { method: 'POST', body: { email, password: 'correct-horse-1' } });
    assert.equal(correct.status, 429);
    resetRateLimits();
  });

  it('throttles repeated account creation', async () => {
    await resetDatabase(prisma);
    resetRateLimits();

    const statuses = [];
    for (let i = 0; i < 14; i += 1) {
      const res = await request('/api/auth/signup', {
        method: 'POST',
        body: { name: `Flood User ${i}`, email: `flood${i}.${Date.now()}@t.dev`, password: 'correct-horse-1' }
      });
      statuses.push(res.status);
      if (res.status === 429) break;
    }

    assert.ok(statuses.includes(429), `signup was never throttled: ${statuses.join(',')}`);
    assert.ok(await prisma.user.count() <= 10, 'registration flood created more accounts than the limit allows');
    resetRateLimits();
  });

  it('throttles the privileged login endpoint separately', async () => {
    await resetDatabase(prisma);
    resetRateLimits();

    const statuses = [];
    for (let i = 0; i < 14; i += 1) {
      const res = await request('/api/auth/admin/login', { method: 'POST', body: { email: 'nobody@t.dev', password: `guess-${i}-pass` } });
      statuses.push(res.status);
      if (res.status === 429) break;
    }

    assert.ok(statuses.includes(429), `admin login was never throttled: ${statuses.join(',')}`);
    resetRateLimits();
  });
});

describe('admin invitation approval flow', () => {
  it('creates a pending invite that is not yet an account', async () => {
    await resetDatabase(prisma);
    const superEmail = `sup${Date.now()}@t.dev`;
    await makeUser({ email: superEmail, password: 'correct-horse-1', role: 'SUPER_ADMIN' });
    const token = await login(superEmail, 'correct-horse-1');

    const inviteEmail = `invitee${Date.now()}@t.dev`;
    const created = await request('/api/admin/invites', {
      method: 'POST',
      token,
      body: { name: 'Invited Admin', email: inviteEmail, role: 'ADMIN' }
    });
    assert.equal(created.status, 201, created.text);
    assert.equal(created.json.data.status, 'PENDING');

    // Critically: no usable account exists yet.
    const loginAttempt = await request('/api/auth/login', {
      method: 'POST',
      body: { email: inviteEmail, password: 'anything-at-all' }
    });
    assert.equal(loginAttempt.status, 401, 'a pending invite must not be able to log in');

    const users = await prisma.user.findMany({ where: { email: inviteEmail } });
    assert.equal(users.length, 0, 'no user row before approval');
  });

  it('activates the account only after approval', async () => {
    await resetDatabase(prisma);
    const superEmail = `sup${Date.now()}@t.dev`;
    await makeUser({ email: superEmail, password: 'correct-horse-1', role: 'SUPER_ADMIN' });
    const token = await login(superEmail, 'correct-horse-1');

    const inviteEmail = `invitee${Date.now()}@t.dev`;
    const created = await request('/api/admin/invites', {
      method: 'POST',
      token,
      body: { name: 'Invited Admin', email: inviteEmail, role: 'ADMIN' }
    });
    const inviteId = created.json.data.id;

    const approved = await request(`/api/admin/invites/${inviteId}/approve`, {
      method: 'POST',
      token,
      body: { password: 'approved-pass-123' }
    });
    assert.equal(approved.status, 200, approved.text);
    assert.equal(approved.json.data.role, 'ADMIN');

    const invitedLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: inviteEmail, password: 'approved-pass-123' }
    });
    assert.equal(invitedLogin.status, 200, 'approved admin can log in');

    const invite = await prisma.adminInvite.findUnique({ where: { id: inviteId } });
    assert.equal(invite.status, 'APPROVED');
    assert.ok(invite.decidedById, 'decision is attributed');
  });

  it('refuses to approve the same invite twice', async () => {
    await resetDatabase(prisma);
    const superEmail = `sup${Date.now()}@t.dev`;
    await makeUser({ email: superEmail, password: 'correct-horse-1', role: 'SUPER_ADMIN' });
    const token = await login(superEmail, 'correct-horse-1');

    const created = await request('/api/admin/invites', {
      method: 'POST',
      token,
      body: { name: 'Invited Admin', email: `i${Date.now()}@t.dev` }
    });
    const inviteId = created.json.data.id;

    await request(`/api/admin/invites/${inviteId}/approve`, { method: 'POST', token, body: { password: 'approved-pass-123' } });
    const second = await request(`/api/admin/invites/${inviteId}/approve`, { method: 'POST', token, body: { password: 'approved-pass-123' } });
    assert.equal(second.status, 400);
  });

  it('revokes a pending invite without creating an account', async () => {
    await resetDatabase(prisma);
    const superEmail = `sup${Date.now()}@t.dev`;
    await makeUser({ email: superEmail, password: 'correct-horse-1', role: 'SUPER_ADMIN' });
    const token = await login(superEmail, 'correct-horse-1');

    const inviteEmail = `rev${Date.now()}@t.dev`;
    const created = await request('/api/admin/invites', { method: 'POST', token, body: { name: 'R', email: inviteEmail } });
    const inviteId = created.json.data.id;

    const revoked = await request(`/api/admin/invites/${inviteId}/revoke`, { method: 'POST', token });
    assert.equal(revoked.status, 200);

    const approveAfterRevoke = await request(`/api/admin/invites/${inviteId}/approve`, { method: 'POST', token, body: { password: 'approved-pass-123' } });
    assert.equal(approveAfterRevoke.status, 400);

    assert.equal(await prisma.user.count({ where: { email: inviteEmail } }), 0);
  });
});

describe('privilege escalation is blocked', () => {
  it('stops an admin from granting SUPER_ADMIN', async () => {
    await resetDatabase(prisma);
    const adminEmail = `adm${Date.now()}@t.dev`;
    const targetEmail = `tgt${Date.now()}@t.dev`;
    await makeUser({ email: adminEmail, password: 'correct-horse-1', role: 'ADMIN' });
    const target = await makeUser({ email: targetEmail, password: 'correct-horse-1' });
    const token = await login(adminEmail, 'correct-horse-1');

    const res = await request(`/api/admin/users/${target.id}/role`, { method: 'PATCH', token, body: { role: 'SUPER_ADMIN' } });
    assert.equal(res.status, 403);

    const after = await prisma.user.findUnique({ where: { id: target.id } });
    assert.equal(after.role, 'STUDENT');
  });

  it('stops an admin from inviting a SUPER_ADMIN', async () => {
    await resetDatabase(prisma);
    const adminEmail = `adm${Date.now()}@t.dev`;
    await makeUser({ email: adminEmail, password: 'correct-horse-1', role: 'ADMIN' });
    const token = await login(adminEmail, 'correct-horse-1');

    const res = await request('/api/admin/invites', {
      method: 'POST',
      token,
      body: { name: 'X', email: `x${Date.now()}@t.dev`, role: 'SUPER_ADMIN' }
    });
    assert.equal(res.status, 403);
  });

  it('lets a super admin grant SUPER_ADMIN', async () => {
    await resetDatabase(prisma);
    const superEmail = `sup${Date.now()}@t.dev`;
    const targetEmail = `tgt${Date.now()}@t.dev`;
    await makeUser({ email: superEmail, password: 'correct-horse-1', role: 'SUPER_ADMIN' });
    const target = await makeUser({ email: targetEmail, password: 'correct-horse-1' });
    const token = await login(superEmail, 'correct-horse-1');

    const res = await request(`/api/admin/users/${target.id}/role`, { method: 'PATCH', token, body: { role: 'SUPER_ADMIN' } });
    assert.equal(res.status, 200, res.text);
    assert.equal(res.json.data.role, 'SUPER_ADMIN');
  });

  it('stops an admin from suspending a super admin', async () => {
    await resetDatabase(prisma);
    const superEmail = `sup${Date.now()}@t.dev`;
    const adminEmail = `adm${Date.now()}@t.dev`;
    const owner = await makeUser({ email: superEmail, password: 'correct-horse-1', role: 'SUPER_ADMIN' });
    await makeUser({ email: adminEmail, password: 'correct-horse-1', role: 'ADMIN' });
    const token = await login(adminEmail, 'correct-horse-1');

    const res = await request(`/api/admin/users/${owner.id}/suspend`, { method: 'PATCH', token });
    assert.equal(res.status, 400);

    const after = await prisma.user.findUnique({ where: { id: owner.id } });
    assert.equal(after.status, 'ACTIVE');
  });

  it('stops an admin from deleting a super admin', async () => {
    await resetDatabase(prisma);
    const superEmail = `sup${Date.now()}@t.dev`;
    const adminEmail = `adm${Date.now()}@t.dev`;
    const owner = await makeUser({ email: superEmail, password: 'correct-horse-1', role: 'SUPER_ADMIN' });
    await makeUser({ email: adminEmail, password: 'correct-horse-1', role: 'ADMIN' });
    const token = await login(adminEmail, 'correct-horse-1');

    const res = await request(`/api/admin/users/${owner.id}`, { method: 'DELETE', token });
    assert.equal(res.status, 400);
    assert.ok(await prisma.user.findUnique({ where: { id: owner.id } }));
  });

  it('stops any admin from acting on their own account', async () => {
    await resetDatabase(prisma);
    const adminEmail = `self${Date.now()}@t.dev`;
    const admin = await makeUser({ email: adminEmail, password: 'correct-horse-1', role: 'ADMIN' });
    const token = await login(adminEmail, 'correct-horse-1');

    assert.equal((await request(`/api/admin/users/${admin.id}/suspend`, { method: 'PATCH', token })).status, 400);
    assert.equal((await request(`/api/admin/users/${admin.id}`, { method: 'DELETE', token })).status, 400);
  });
});

describe('password reset security', () => {
  it('accepts a reset link once and rejects the replay', async () => {
    await resetDatabase(prisma);
    resetRateLimits();

    const email = `reset${Date.now()}@t.dev`;
    await makeUser({ email, password: 'correct-horse-1' });

    // Mint a reset token through the same secret the service verifies with.
    const jwt = (await import('jsonwebtoken')).default;
    const { env } = await import('../src/config/env.js');
    const jti = `jti-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const token = jwt.sign(
      { sub: (await prisma.user.findUnique({ where: { email } })).id, purpose: 'password_reset', jti },
      env.PASSWORD_RESET_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    const first = await request('/api/auth/reset-password', { method: 'POST', body: { token, password: 'brand-new-pass-1' } });
    assert.equal(first.status, 200, first.text);

    // The same link must never work twice.
    const replay = await request('/api/auth/reset-password', { method: 'POST', body: { token, password: 'attacker-pass-99' } });
    assert.equal(replay.status, 401);
    assert.match(replay.json.message, /already been used/i);

    // And the new password is the one that sticks.
    const withNew = await request('/api/auth/login', { method: 'POST', body: { email, password: 'brand-new-pass-1' } });
    assert.equal(withNew.status, 200);
    const withOld = await request('/api/auth/login', { method: 'POST', body: { email, password: 'correct-horse-1' } });
    assert.equal(withOld.status, 401, 'the old password must stop working');
    resetRateLimits();
  });

  it('rejects a reset token that is not signed with the reset secret', async () => {
    await resetDatabase(prisma);
    resetRateLimits();
    const jwt = (await import('jsonwebtoken')).default;
    const { env } = await import('../src/config/env.js');

    const user = await makeUser({ email: `wrongsecret${Date.now()}@t.dev`, password: 'correct-horse-1' });

    // Signed with the access-token secret: a valid JWT, but not a reset token.
    const forged = jwt.sign(
      { sub: user.id, purpose: 'password_reset', jti: `jti-${Date.now()}` },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const res = await request('/api/auth/reset-password', { method: 'POST', body: { token: forged, password: 'attacker-pass-99' } });
    assert.equal(res.status, 401);
    resetRateLimits();
  });

  it('revokes existing sessions when the password is reset', async () => {
    await resetDatabase(prisma);
    resetRateLimits();

    const email = `revoke${Date.now()}@t.dev`;
    await makeUser({ email, password: 'correct-horse-1' });
    const oldToken = await login(email, 'correct-horse-1');

    const jwt = (await import('jsonwebtoken')).default;
    const { env } = await import('../src/config/env.js');
    const user = await prisma.user.findUnique({ where: { email } });
    const token = jwt.sign(
      { sub: user.id, purpose: 'password_reset', jti: `jti-${Date.now()}-${Math.random().toString(36).slice(2)}` },
      env.PASSWORD_RESET_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    const res = await request('/api/auth/reset-password', { method: 'POST', body: { token, password: 'another-new-pass-1' } });
    assert.equal(res.status, 200, res.text);

    const stale = await request('/api/auth/me', { token: oldToken });
    assert.equal(stale.status, 401, 'a password reset must invalidate the previous session');
    resetRateLimits();
  });
});

describe('super admin bootstrap', () => {
  it('creates the first SUPER_ADMIN and can log in', async () => {
    await resetDatabase(prisma);
    const { seedAdminFromEnv } = await import('../src/services/seedAdminService.js');

    const email = `owner${Date.now()}@t.dev`;
    const result = await seedAdminFromEnv({
      email,
      password: 'bootstrap-pass-123',
      name: 'Platform Owner'
    });
    assert.equal(result.created, true);
    assert.equal(result.user.role, 'SUPER_ADMIN');

    // The seeded owner can actually reach the privileged surface.
    const token = await login(email, 'bootstrap-pass-123');
    const stats = await request('/api/admin/stats', { token });
    assert.equal(stats.status, 200, stats.text);

    // Re-running must not change the credentials of an existing owner.
    const again = await seedAdminFromEnv({ email, password: 'a-different-pass-99', name: 'Someone Else' });
    assert.equal(again.created, false);
    assert.equal(again.user.id, result.user.id);

    // Use a raw request here: the seed must not have rewritten the password.
    const rewritten = await request('/api/auth/login', { method: 'POST', body: { email, password: 'a-different-pass-99' } });
    assert.equal(rewritten.status, 401, 'seeding must never rewrite an owner password');
    assert.equal((await login(email, 'bootstrap-pass-123')) !== null, true, 'the original password still works');
  });

  it('refuses a weak bootstrap password', async () => {
    await resetDatabase(prisma);
    const { seedAdminFromEnv } = await import('../src/services/seedAdminService.js');
    await assert.rejects(
      seedAdminFromEnv({ email: `weak${Date.now()}@t.dev`, password: 'short' }),
      /at least 12 characters/
    );
  });
});

describe('token invalidation', () => {
  it('revokes outstanding tokens when a user is suspended', async () => {
    await resetDatabase(prisma);
    const superEmail = `sup${Date.now()}@t.dev`;
    const victimEmail = `vic${Date.now()}@t.dev`;
    await makeUser({ email: superEmail, password: 'correct-horse-1', role: 'SUPER_ADMIN' });
    await makeUser({ email: victimEmail, password: 'correct-horse-1' });
    const victimToken = await login(victimEmail, 'correct-horse-1');
    const adminToken = await login(superEmail, 'correct-horse-1');

    assert.equal((await request('/api/auth/me', { token: victimToken })).status, 200);

    const victim = await prisma.user.findUnique({ where: { email: victimEmail } });
    await request(`/api/admin/users/${victim.id}/suspend`, { method: 'PATCH', token: adminToken });

    assert.equal((await request('/api/auth/me', { token: victimToken })).status, 403, 'suspended user token stops working');
  });

  it('revokes outstanding tokens when the role changes', async () => {
    await resetDatabase(prisma);
    const superEmail = `sup${Date.now()}@t.dev`;
    const targetEmail = `tgt${Date.now()}@t.dev`;
    await makeUser({ email: superEmail, password: 'correct-horse-1', role: 'SUPER_ADMIN' });
    const target = await makeUser({ email: targetEmail, password: 'correct-horse-1' });
    const targetToken = await login(targetEmail, 'correct-horse-1');
    const adminToken = await login(superEmail, 'correct-horse-1');

    await request(`/api/admin/users/${target.id}/role`, { method: 'PATCH', token: adminToken, body: { role: 'ADMIN' } });

    const res = await request('/api/auth/me', { token: targetToken });
    assert.equal(res.status, 401, 'stale token must be rejected after a role change');
  });
});
