import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, app, prisma, bcrypt, signupStudent } from './helpers.mjs';

// Admin Management (SUPER_ADMIN only): invite → accept → approve/reject,
// revoke/restore/delete of ADMIN accounts. Every step hits the real API.
const SUPER_EMAIL = 'super-mgmt@zera.local';
const ADMIN_EMAIL = 'plain-mgmt@zera.local';

describe('Admin management (super admin roster control)', () => {
  let superAgent;
  let adminAgent;
  let studentAgent;
  let studentEmail;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        name: 'Super', email: SUPER_EMAIL,
        passwordHash: await bcrypt.hash('SuperPass123', 12),
        role: 'SUPER_ADMIN', emailVerified: true,
      },
    });
    await prisma.user.create({
      data: {
        name: 'Plain Admin', email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash('AdminPass123', 12),
        role: 'ADMIN', emailVerified: true,
      },
    });
    superAgent = request.agent(app);
    await superAgent.post('/api/auth/login').send({ email: SUPER_EMAIL, password: 'SuperPass123' });
    adminAgent = request.agent(app);
    await adminAgent.post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'AdminPass123' });
    studentAgent = request.agent(app);
    const { payload } = await signupStudent(studentAgent);
    studentEmail = payload.email;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [SUPER_EMAIL, ADMIN_EMAIL, 'invitee-mgmt@zera.local', 'invitee2-mgmt@zera.local', 'invitee3-mgmt@zera.local'] } } });
    await prisma.$disconnect();
  });

  it('admin roster endpoints are SUPER_ADMIN-only', async () => {
    expect((await studentAgent.get('/api/admin/admins')).status).toBe(403);
    expect((await adminAgent.get('/api/admin/admins')).status).toBe(403);
    expect((await adminAgent.post('/api/admin/admins/invite').send({ name: 'X', email: 'x@y.z' })).status).toBe(403);

    const res = await superAgent.get('/api/admin/admins');
    expect(res.status).toBe(200);
    const emails = res.body.data.admins.map((a) => a.email);
    expect(emails).toContain(SUPER_EMAIL);
    expect(emails).toContain(ADMIN_EMAIL);
  });

  it('plain ADMIN keeps normal admin powers but not roster powers', async () => {
    expect((await adminAgent.get('/api/admin/stats')).status).toBe(200);
  });

  it('full invite → accept → approve lifecycle', async () => {
    // 1. Invite
    let res = await superAgent.post('/api/admin/admins/invite').send({ name: 'Invitee One', email: 'invitee-mgmt@zera.local' });
    expect(res.status).toBe(201);
    expect(res.body.data.admin.status).toBe('INVITED');
    const code = res.body.data.devInviteCode;
    expect(typeof code).toBe('string'); // dev env without SMTP exposes the code once

    // The invitee cannot log in yet (placeholder password, INVITED status).
    res = await request(app).post('/api/auth/login').send({ email: 'invitee-mgmt@zera.local', password: 'anything' });
    expect(res.status).toBe(401);

    // 2. Accept with a wrong code fails; with the right code it succeeds.
    res = await request(app).post('/api/auth/accept-admin-invite').send({
      email: 'invitee-mgmt@zera.local', code: '000000', password: 'NewPass123', confirmPassword: 'NewPass123',
    });
    expect(res.status).toBe(400);

    res = await request(app).post('/api/auth/accept-admin-invite').send({
      email: 'invitee-mgmt@zera.local', code, password: 'NewPass123', confirmPassword: 'NewPass123',
    });
    expect(res.status).toBe(200);

    // Still cannot log in — now PENDING approval.
    res = await request(app).post('/api/auth/login').send({ email: 'invitee-mgmt@zera.local', password: 'NewPass123' });
    expect(res.status).toBe(401);

    // 3. Approve
    const invitee = await prisma.user.findUnique({ where: { email: 'invitee-mgmt@zera.local' } });
    res = await superAgent.post(`/api/admin/admins/${invitee.id}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.data.admin.status).toBe('ACTIVE');

    // 4. Now login works and the new admin has admin powers — but no roster powers.
    const fresh = request.agent(app);
    res = await fresh.post('/api/auth/login').send({ email: 'invitee-mgmt@zera.local', password: 'NewPass123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('ADMIN');
    expect((await fresh.get('/api/admin/stats')).status).toBe(200);
    expect((await fresh.get('/api/admin/admins')).status).toBe(403);
  });

  it('reject deletes an INVITED/PENDING account', async () => {
    let res = await superAgent.post('/api/admin/admins/invite').send({ name: 'Invitee Two', email: 'invitee2-mgmt@zera.local' });
    const code = res.body.data.devInviteCode;
    await request(app).post('/api/auth/accept-admin-invite').send({
      email: 'invitee2-mgmt@zera.local', code, password: 'NewPass123', confirmPassword: 'NewPass123',
    });

    const invitee = await prisma.user.findUnique({ where: { email: 'invitee2-mgmt@zera.local' } });
    expect(invitee.status).toBe('PENDING');

    res = await superAgent.post(`/api/admin/admins/${invitee.id}/reject`);
    expect(res.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { email: 'invitee2-mgmt@zera.local' } })).toBeNull();
  });

  it('revoke blocks login and existing sessions; restore brings them back', async () => {
    const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    let res = await superAgent.post(`/api/admin/admins/${admin.id}/revoke`);
    expect(res.status).toBe(200);
    expect(res.body.data.admin.status).toBe('SUSPENDED');

    // Fresh login denied…
    res = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'AdminPass123' });
    expect(res.status).toBe(401);
    // …and the previously issued session is rejected too.
    expect((await adminAgent.get('/api/admin/stats')).status).toBe(403);

    // Restore
    res = await superAgent.post(`/api/admin/admins/${admin.id}/restore`);
    expect(res.status).toBe(200);
    res = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'AdminPass123' });
    expect(res.status).toBe(200);
  });

  it('protects super admins and self-actions', async () => {
    const superUser = await prisma.user.findUnique({ where: { email: SUPER_EMAIL } });
    const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    // Cannot act on your own account (checked before anything else).
    expect((await superAgent.post(`/api/admin/admins/${superUser.id}/revoke`)).status).toBe(403);
    expect((await superAgent.post(`/api/admin/admins/${superUser.id}/approve`)).status).toBe(403);
    expect((await superAgent.delete(`/api/admin/admins/${superUser.id}`)).status).toBe(403);
    // A plain ADMIN can't use roster endpoints at all.
    expect((await adminAgent.post(`/api/admin/admins/${admin.id}/revoke`)).status).toBe(403);

    // Super admin self-revoke explicitly forbidden: use a second super admin for the check.
    await prisma.user.create({
      data: { name: 'Super2', email: 'super2-mgmt@zera.local', passwordHash: await bcrypt.hash('SuperPass123', 12), role: 'SUPER_ADMIN', emailVerified: true },
    });
    const super2Agent = request.agent(app);
    await super2Agent.post('/api/auth/login').send({ email: 'super2-mgmt@zera.local', password: 'SuperPass123' });
    expect((await super2Agent.post(`/api/admin/admins/${superUser.id}/revoke`)).status).toBe(404);
    await prisma.user.deleteMany({ where: { email: 'super2-mgmt@zera.local' } });
  });

  it('invite validation: duplicates conflict, re-invite re-issues code', async () => {
    // Inviting an email that already has any other account → conflict.
    let res = await superAgent.post('/api/admin/admins/invite').send({ name: 'Student Again', email: studentEmail });
    expect(res.status).toBe(409);

    res = await superAgent.post('/api/admin/admins/invite').send({ name: 'Invitee Three', email: 'invitee3-mgmt@zera.local' });
    expect(res.status).toBe(201);
    const firstCode = res.body.data.devInviteCode;
    res = await superAgent.post('/api/admin/admins/invite').send({ name: 'Invitee Three', email: 'invitee3-mgmt@zera.local' });
    expect(res.status).toBe(201); // re-issue, not 409
    expect(res.body.data.devInviteCode).not.toBe(firstCode);
  });
});
