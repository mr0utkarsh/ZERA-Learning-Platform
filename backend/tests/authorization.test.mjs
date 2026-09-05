import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, app, prisma, bcrypt, signupStudent } from './helpers.mjs';

const ADMIN_EMAIL = 'admin-test@zera.local';

describe('Authorization', () => {
  let studentAgent;
  let adminAgent;

  beforeAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.user.create({
      data: {
        name: 'Admin', email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash('AdminPass123', 12),
        role: 'ADMIN', emailVerified: true,
      },
    });

    studentAgent = request.agent(app);
    await signupStudent(studentAgent);

    adminAgent = request.agent(app);
    await adminAgent.post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'AdminPass123' });
  });
  afterAll(async () => prisma.$disconnect());

  it('students cannot access any admin endpoint', async () => {
    const endpoints = [
      ['get', '/api/admin/stats'],
      ['get', '/api/admin/students'],
    ];
    for (const [method, url] of endpoints) {
      const res = await studentAgent[method](url);
      expect(res.status).toBe(403);
    }
  });

  it('anonymous users cannot access admin or student endpoints', async () => {
    expect((await request(app).get('/api/admin/stats')).status).toBe(401);
    expect((await request(app).get('/api/courses')).status).toBe(401);
    expect((await request(app).get('/api/progress')).status).toBe(401);
  });

  it('admins can read stats and the student list', async () => {
    const stats = await adminAgent.get('/api/admin/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.data.stats.totalStudents).toBeGreaterThanOrEqual(1);

    const students = await adminAgent.get('/api/admin/students?q=@');
    expect(students.status).toBe(200);
    expect(students.body.data.students.length).toBeGreaterThanOrEqual(1);
  });

  it('admin can suspend and restore a student; suspension blocks access', async () => {
    const list = await adminAgent.get('/api/admin/students');
    const target = list.body.data.students[0];

    // Victim has a valid session BEFORE being suspended
    const victim = request.agent(app);
    const loginFirst = await victim.post('/api/auth/login').send({ email: target.email, password: 'Passw0rd123' });
    expect(loginFirst.status).toBe(200);
    expect((await victim.get('/api/courses')).status).toBe(200);

    const suspend = await adminAgent.post(`/api/admin/students/${target.id}/suspend`);
    expect(suspend.status).toBe(200);

    // Existing session is now rejected (403: account suspended)
    const blocked = await victim.get('/api/courses');
    expect(blocked.status).toBe(403);
    // Fresh logins are rejected too (401)
    const freshLogin = await request(app).post('/api/auth/login').send({ email: target.email, password: 'Passw0rd123' });
    expect(freshLogin.status).toBe(401);

    const restore = await adminAgent.post(`/api/admin/students/${target.id}/restore`);
    expect(restore.status).toBe(200);
    const after = await victim.get('/api/courses');
    expect(after.status).toBe(200);
  });

  it('admin cannot suspend/delete their own account', async () => {
    const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    expect((await adminAgent.post(`/api/admin/students/${admin.id}/suspend`)).status).toBe(403);
  });

  it('admin cannot delete another admin as if it were a student', async () => {
    const otherAdmin = await prisma.user.create({
      data: {
        name: 'Second Admin', email: `admin2-${Date.now()}@zera.local`,
        passwordHash: await bcrypt.hash('AdminPass123', 12),
        role: 'ADMIN', emailVerified: true,
      },
    });
    const res = await adminAgent.delete(`/api/admin/students/${otherAdmin.id}`);
    expect(res.status).toBe(400); // admins are not deletable via the student endpoint
  });
});
