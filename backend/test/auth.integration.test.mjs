import assert from 'node:assert';
import { test } from 'node:test';

const BASE = 'http://localhost:5000/api/auth';

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: r.status, body: await r.json() };
}

test('signup creates a user and returns a token', async () => {
  const email = `integ${Date.now()}@example.com`;
  const res = await post('/signup', { name: 'Integration User', email, password: 'Str0ng!Pass' });
  assert.equal(res.status, 201);
  assert.ok(res.body.success);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.email, email);
  assert.equal(res.body.data.user.role, 'STUDENT');
});

test('duplicate signup returns 409', async () => {
  const email = `dupe${Date.now()}@example.com`;
  await post('/signup', { name: 'Dup', email, password: 'Str0ng!Pass' });
  const res = await post('/signup', { name: 'Dup2', email, password: 'Str0ng!Pass' });
  assert.equal(res.status, 409);
  assert.ok(!res.body.success);
});

test('login with correct credentials returns a token', async () => {
  const email = `log${Date.now()}@example.com`;
  await post('/signup', { name: 'Login User', email, password: 'Str0ng!Pass' });
  const res = await post('/login', { email, password: 'Str0ng!Pass' });
  assert.equal(res.status, 200);
  assert.ok(res.body.success);
  assert.ok(res.body.data.token);
});

test('login with wrong password returns 401', async () => {
  const email = `bad${Date.now()}@example.com`;
  await post('/signup', { name: 'Bad', email, password: 'Str0ng!Pass' });
  const res = await post('/login', { email, password: 'DifferentStr0ng!Pass' });
  assert.equal(res.status, 401);
  assert.ok(!res.body.success);
});

test('forgot password returns identical generic response for existing and non-existing email', async () => {
  const existing = `enum${Date.now()}@example.com`;
  await post('/signup', { name: 'Enum', email: existing, password: 'Str0ng!Pass' });

  const existingRes = await post('/forgot-password', { email: existing });
  const nonExistingRes = await post('/forgot-password', { email: 'nonexistent@example.com' });

  assert.equal(existingRes.status, nonExistingRes.status);
  assert.equal(existingRes.body.success, nonExistingRes.body.success);
  assert.equal(existingRes.body.data.message, nonExistingRes.body.data.message);
  assert.ok(existingRes.body.data.message.includes('account exists'));
});
