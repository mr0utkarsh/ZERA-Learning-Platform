import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, app, prisma, bcrypt, signupStudent, uniqueEmail } from './helpers.mjs';

describe('Authentication', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({});
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Signup validation', () => {
    it('rejects missing fields', async () => {
      const res = await request(app).post('/api/auth/signup').send({ email: 'a@b.co' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid email format', async () => {
      const res = await request(app).post('/api/auth/signup').send({ name: 'Valid Name', email: 'not-an-email', password: 'Passw0rd123' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/email/i);
    });

    it('rejects weak passwords', async () => {
      const res = await request(app).post('/api/auth/signup').send({ name: 'A B', email: uniqueEmail(), password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/password/i);
    });

    it('rejects mismatched confirm password', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'A B', email: uniqueEmail(), password: 'Passw0rd123', confirmPassword: 'Different123',
      });
      expect(res.status).toBe(400);
    });

    it('creates an account with hashed password and issues verification OTP', async () => {
      const email = uniqueEmail();
      const res = await request(app).post('/api/auth/signup').send({ name: 'Asha', email, password: 'Passw0rd123' });
      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.devOtp).toMatch(/^\d{6}$/);

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user.passwordHash).not.toBe('Passw0rd123');
      expect(await bcrypt.compare('Passw0rd123', user.passwordHash)).toBe(true);
      expect(user.role).toBe('STUDENT');
      const otp = await prisma.otp.findFirst({ where: { userId: user.id, purpose: 'EMAIL_VERIFICATION' } });
      expect(otp).toBeTruthy();
      expect(otp.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects duplicate email', async () => {
      const email = uniqueEmail();
      await request(app).post('/api/auth/signup').send({ name: 'A', email, password: 'Passw0rd123' });
      const res = await request(app).post('/api/auth/signup').send({ name: 'B', email, password: 'Passw0rd123' });
      expect(res.status).toBe(400);
    });
  });

  describe('Login / logout / session', () => {
    it('logs in with correct credentials and sets an httpOnly cookie', async () => {
      const { payload } = await signupStudent(request(app));
      const res = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'].join(';');
      expect(cookies).toContain('zera_token=');
      expect(cookies).toMatch(/HttpOnly/i);
    });

    it('rejects wrong password', async () => {
      const { payload } = await signupStudent(request(app));
      const res = await request(app).post('/api/auth/login').send({ email: payload.email, password: 'WrongPass123' });
      expect(res.status).toBe(401);
    });

    it('rejects unknown email with the same generic message', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'ghost@nowhere.dev', password: 'Passw0rd123' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('GET /api/auth/me requires auth and returns the user', async () => {
      const anon = await request(app).get('/api/auth/me');
      expect(anon.status).toBe(401);

      const agent = request.agent(app);
      const { payload } = await signupStudent(agent);
      await agent.post('/api/auth/login').send({ email: payload.email, password: payload.password });
      const me = await agent.get('/api/auth/me');
      expect(me.status).toBe(200);
      expect(me.body.data.user.email).toBe(payload.email);
    });

    it('logout clears the cookie and ends the session', async () => {
      const agent = request.agent(app);
      const { payload } = await signupStudent(agent);
      await agent.post('/api/auth/login').send({ email: payload.email, password: payload.password });
      await agent.post('/api/auth/logout');
      const me = await agent.get('/api/auth/me');
      expect(me.status).toBe(401);
    });
  });

  describe('Email verification OTP', () => {
    it('verifies with the correct code and rejects wrong codes with attempt limits', async () => {
      const agent = request.agent(app);
      const { res, payload } = await signupStudent(agent);
      const code = res.body.data.devOtp;

      const wrong = await agent.post('/api/auth/verify-email').send({ code: '999999' });
      expect(wrong.status).toBe(400);
      expect(wrong.body.message).toMatch(/attempts remaining/i);

      const right = await agent.post('/api/auth/verify-email').send({ code });
      expect(right.status).toBe(200);
      const user = await prisma.user.findUnique({ where: { email: payload.email } });
      expect(user.emailVerified).toBe(true);
    });

    it('a used OTP cannot be reused', async () => {
      const agent = request.agent(app);
      const { res } = await signupStudent(agent);
      const code = res.body.data.devOtp;
      await agent.post('/api/auth/verify-email').send({ code });
      const replay = await agent.post('/api/auth/verify-email').send({ code });
      expect(replay.status).toBe(400);
    });
  });

  describe('Forgot / reset password', () => {
    it('full reset flow with OTP', async () => {
      const { payload } = await signupStudent(request(app));
      const forgot = await request(app).post('/api/auth/forgot-password').send({ email: payload.email });
      expect(forgot.status).toBe(200);
      const code = forgot.body.data.devOtp;
      expect(code).toMatch(/^\d{6}$/);

      const verify = await request(app).post('/api/auth/verify-reset-otp').send({ email: payload.email, code });
      expect(verify.status).toBe(200);

      const reset = await request(app).post('/api/auth/reset-password').send({
        email: payload.email, code, password: 'NewPass456', confirmPassword: 'NewPass456',
      });
      expect(reset.status).toBe(200);

      const loginOld = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
      expect(loginOld.status).toBe(401);
      const loginNew = await request(app).post('/api/auth/login').send({ email: payload.email, password: 'NewPass456' });
      expect(loginNew.status).toBe(200);
    });

    it('reset with wrong OTP fails', async () => {
      const { payload } = await signupStudent(request(app));
      await request(app).post('/api/auth/forgot-password').send({ email: payload.email });
      const res = await request(app).post('/api/auth/reset-password').send({
        email: payload.email, code: '123456', password: 'NewPass456',
      });
      expect(res.status).toBe(400);
    });

    it('forgot-password does not reveal whether the email exists', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@nowhere.dev' });
      expect(res.status).toBe(200);
      expect(res.body.data?.devOtp).toBeUndefined();
    });
  });

  describe('Suspended accounts', () => {
    it('a suspended student cannot log in', async () => {
      const agent = request.agent(app);
      const { payload } = await signupStudent(agent);
      const user = await prisma.user.findUnique({ where: { email: payload.email } });
      await prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' } });

      const login = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
      expect(login.status).toBe(401);
    });
  });
});
