/**
 * Tests for the browser API client (js/api.js).
 *
 * The client is a plain script that publishes `window.ZeraApi`, so it is loaded
 * into a fake window with a stubbed `fetch`. That lets us assert on the exact
 * URL, method, headers and body it produces for each endpoint, which is the
 * part most likely to drift from the backend routes.
 *
 * Run with: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const CLIENT_PATH = path.resolve(process.cwd(), '..', 'js', 'api.js');
const CLIENT_SOURCE = fs.readFileSync(CLIENT_PATH, 'utf8');

/**
 * Objects created inside the vm sandbox have a different realm's Object
 * prototype, which makes deepStrictEqual fail on identity alone. Comparing the
 * JSON form checks the values instead.
 */
const deepEqual = (actual, expected, message) =>
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);

/** Minimal localStorage stand-in. */
function createStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    _data: data
  };
}

/**
 * Loads js/api.js into a sandbox and returns the client plus a record of every
 * request it made.
 */
function loadClient({ origin = 'http://localhost:5000', storage = createStorage(), fetchImpl } = {}) {
  const calls = [];

  const window = {
    localStorage: storage,
    fetch: fetchImpl || (async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: {} }) }))
  };
  window.window = window;
  // Mirrors how a deployment overrides the origin before this script loads.
  if (origin) window.ZERA_API_BASE = origin;

  const context = vm.createContext({ window, fetch: window.fetch, console, AbortController, FormData });

  // Track calls through a wrapper so assertions can read what was sent. The
  // original implementation is captured first, otherwise the wrapper would end
  // up calling itself.
  const originalFetch = window.fetch;
  const record = (url, options) => {
    calls.push({ url, options: options || {} });
    return originalFetch(url, options);
  };
  window.fetch = record;
  context.fetch = record;

  vm.runInContext(CLIENT_SOURCE, context, { filename: CLIENT_PATH });

  return { api: window.ZeraApi, calls, storage, window };
}

test('publishes a single ZeraApi global', () => {
  const { api } = loadClient();
  assert.ok(api, 'window.ZeraApi should exist');
  assert.equal(typeof api.request, 'function');
  assert.equal(typeof api.ApiError, 'function');
});

test('defaults the origin to localhost:5000 and honours an override', () => {
  assert.equal(loadClient().api.ORIGIN, 'http://localhost:5000');

  const overridden = loadClient({ origin: 'https://api.example.com' });
  assert.equal(overridden.api.ORIGIN, 'https://api.example.com');
  assert.equal(overridden.window.ZERA_API_BASE, 'https://api.example.com');
});

test('prepends /api to every request', async () => {
  const { api, calls } = loadClient();
  await api.student.notes();
  assert.equal(calls[0].url, 'http://localhost:5000/api/student/notes');
});

test('unwraps the data envelope', async () => {
  const { api } = loadClient({
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: { id: 'n1' } }) })
  });
  deepEqual(await api.student.notes(), { id: 'n1' });
});

test('raw:true returns the whole envelope for auth flows', async () => {
  const { api } = loadClient({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { user: { id: 'u1' }, token: 'tok' } })
    })
  });
  const result = await api.auth.login({ email: 'a@b.c', password: 'pw' });
  assert.equal(result.data.token, 'tok');
});

test('sends JSON content-type and stringifies the body', async () => {
  const { api, calls } = loadClient();
  await api.student.createNote({ title: 't', content: 'c' });
  const { options } = calls[0];
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.body, JSON.stringify({ title: 't', content: 'c' }));
});

test('does not set Content-Type for multipart bodies', async () => {
  const { api, calls } = loadClient();
  const form = new FormData();
  form.append('file', new Blob(['x']), 's.txt');
  await api.onboarding.uploadSyllabus(form);

  const { options } = calls[0];
  // The browser must choose the boundary itself.
  assert.equal(options.headers['Content-Type'], undefined);
  assert.equal(options.body, form);
  assert.equal(options.method, 'POST');
});

test('omits the body entirely for GET', async () => {
  const { api, calls } = loadClient();
  await api.courses.catalog();
  assert.equal(calls[0].options.body, undefined);
  assert.equal(calls[0].options.method, 'GET');
});

test('attaches the bearer token when one is stored', async () => {
  const { api, calls } = loadClient({ storage: createStorage({ zera_token: 'secret-token' }) });
  await api.student.profile();
  assert.equal(calls[0].options.headers.Authorization, 'Bearer secret-token');
});

test('sends no Authorization header for public auth calls', async () => {
  const { api, calls } = loadClient({ storage: createStorage({ zera_token: 'secret-token' }) });
  await api.auth.login({ email: 'a@b.c', password: 'pw' });
  assert.equal(calls[0].options.headers.Authorization, undefined);
});

test('each endpoint maps to the method the backend route actually uses', async () => {
  const { api, calls } = loadClient();
  const cases = [
    [() => api.auth.signup({}), 'POST', '/api/auth/signup'],
    [() => api.auth.login({}), 'POST', '/api/auth/login'],
    [() => api.auth.adminLogin({}), 'POST', '/api/auth/admin/login'],
    [() => api.auth.forgotPassword({}), 'POST', '/api/auth/forgot-password'],
    [() => api.auth.resetPassword({}), 'POST', '/api/auth/reset-password'],
    [() => api.onboarding.get(), 'GET', '/api/onboarding'],
    [() => api.onboarding.saveProfile({}), 'PUT', '/api/onboarding/profile'],
    [() => api.courses.catalog(), 'GET', '/api/catalog'],
    [() => api.courses.dashboard(), 'GET', '/api/dashboard'],
    [() => api.courses.enroll('c1'), 'POST', '/api/courses/c1/enroll'],
    [() => api.courses.progress('c1'), 'GET', '/api/courses/c1/progress'],
    [() => api.courses.completeLesson('c1', 'l1'), 'POST', '/api/courses/c1/lessons/l1/complete'],
    // PATCH, not PUT: studentRoutes exposes router.patch('/profile').
    [() => api.student.updateProfile({}), 'PATCH', '/api/student/profile'],
    [() => api.student.createNote({}), 'POST', '/api/student/notes'],
    [() => api.student.updateNote('n1', {}), 'PATCH', '/api/student/notes/n1'],
    [() => api.student.deleteNote('n1'), 'DELETE', '/api/student/notes/n1'],
    [() => api.student.saveSettings({}), 'PUT', '/api/student/settings'],
    [() => api.student.submitQuizAttempt('q1', {}), 'POST', '/api/student/quizzes/q1/attempts'],
    [() => api.student.markNotificationRead('x'), 'PATCH', '/api/student/notifications/x/read'],
    [() => api.student.deleteBookmark('b1'), 'DELETE', '/api/student/bookmarks/b1'],
    [() => api.support.create({}), 'POST', '/api/student/support-requests'],
    [() => api.ai.doubtSolver({}), 'POST', '/api/ai/doubt-solver'],
    [() => api.admin.suspendUser('u1'), 'PATCH', '/api/admin/users/u1/suspend'],
    [() => api.admin.deleteUser('u1'), 'DELETE', '/api/admin/users/u1'],
    [() => api.admin.revokeInvite('i1'), 'POST', '/api/admin/invites/i1/revoke']
  ];

  for (const [invoke, method, url] of cases) {
    calls.length = 0;
    // Awaited so a rejection cannot surface after the test has already ended.
    await invoke();
    const call = calls[0];
    assert.equal(call.options.method, method, `${method} ${url}`);
    assert.equal(call.url, 'http://localhost:5000' + url);
  }
});

test('raises ApiError with status and payload on failure', async () => {
  const { api } = loadClient({
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      json: async () => ({ success: false, message: 'Admins only.' })
    })
  });

  await assert.rejects(
    () => api.courses.catalog(),
    (error) => {
      assert.equal(error.name, 'ApiError');
      assert.equal(error.status, 403);
      assert.equal(error.message, 'Admins only.');
      assert.equal(error.payload.success, false);
      return true;
    }
  );
});

test('treats a success:false body as an error even with HTTP 200', async () => {
  const { api } = loadClient({
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ success: false, message: 'Nope.' }) })
  });
  await assert.rejects(() => api.courses.catalog(), /Nope\./);
});

test('a 401 clears the stored session but a 403 does not', async () => {
  const unauthorized = loadClient({
    storage: createStorage({ zera_token: 'stale', zera_user: '{"isLoggedIn":true}' }),
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ success: false, message: 'expired' }) })
  });
  await assert.rejects(() => unauthorized.api.student.profile());
  assert.equal(unauthorized.storage.getItem('zera_token'), null);

  const forbidden = loadClient({
    storage: createStorage({ zera_token: 'good', zera_user: '{"isLoggedIn":true}' }),
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ success: false, message: 'nope' }) })
  });
  await assert.rejects(() => forbidden.api.student.profile());
  // A role error must not log the user out.
  assert.equal(forbidden.storage.getItem('zera_token'), 'good');
});

test('reports an unreachable server clearly', async () => {
  const { api } = loadClient({
    fetchImpl: async () => { throw new TypeError('Failed to fetch'); }
  });
  await assert.rejects(() => api.courses.catalog(), /Cannot reach the ZERA server/);
});

test('session helpers round-trip and clear', () => {
  const { api, storage } = loadClient();
  assert.equal(api.isLoggedIn(), false);

  api.setToken('t1');
  api.setUser({ id: 'u1', isLoggedIn: true });
  assert.equal(api.getToken(), 't1');
  assert.equal(api.isLoggedIn(), true);
  deepEqual(api.getUser(), { id: 'u1', isLoggedIn: true });

  api.clearSession();
  assert.equal(api.isLoggedIn(), false);
  deepEqual(api.getUser(), { isLoggedIn: false });
});

test('survives a storage backend that throws', () => {
  const hostile = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); }
  };
  const { api } = loadClient({ storage: hostile });
  // Private browsing: helpers degrade instead of throwing at the call site.
  assert.equal(api.getToken(), null);
  assert.equal(api.isLoggedIn(), false);
  deepEqual(api.getUser(), {});
});

test('falls back to a generic message when the body is not JSON', async () => {
  const { api } = loadClient({
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => { throw new Error('bad json'); } })
  });
  await assert.rejects(() => api.courses.catalog(), /Request failed with status 500/);
});
