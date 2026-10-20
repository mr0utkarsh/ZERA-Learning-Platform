/**
 * ZERA shared API client.
 *
 * This is the single place that knows how to reach the backend. Before this
 * existed, 14 files hardcoded `http://localhost:5000` and six of them each
 * declared their own `API_BASE_URL`, so changing a port or a route prefix meant
 * editing a dozen files and missing one at runtime.
 *
 * Loaded as a plain script (no bundler in this project), so it publishes a
 * single global instead of using ES module imports.
 */
(function (global) {
  'use strict';

  /**
   * The API origin. Kept on `window.ZERA_API_BASE` so a deployment can override
   * it from any page without editing source: e.g. in an inline script before
   * this file loads, `window.ZERA_API_BASE = 'https://api.example.com'`.
   *
   * Without an override the page talks to its own origin, which is what the
   * deployment wants: the host proxies `/api` to the backend, so there is no
   * CORS round trip and no hard-coded host. A page served from localhost has no
   * such proxy, so it keeps calling the backend directly.
   */
  const defaultOrigin = (() => {
    const loc = global.location;
    if (!loc) return '';
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(loc.hostname || '');
    return isLocal ? 'http://localhost:5000' : loc.origin;
  })();
  const ORIGIN = global.ZERA_API_BASE || defaultOrigin;

  const TOKEN_KEY = 'zera_token';
  const USER_KEY = 'zera_user';

  // ─── Session ────────────────────────────────────────────────────────────────

  const getToken = () => {
    try {
      return global.localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  };

  const setToken = (token) => {
    try {
      global.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* private browsing: the session simply will not persist */
    }
  };

  const getUser = () => {
    try {
      return JSON.parse(global.localStorage.getItem(USER_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const setUser = (user) => {
    try {
      global.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
  };

  const clearSession = () => {
    try {
      global.localStorage.removeItem(TOKEN_KEY);
      global.localStorage.setItem(USER_KEY, JSON.stringify({ isLoggedIn: false }));
    } catch {
      /* ignore */
    }
  };

  const isLoggedIn = () => Boolean(getToken());

  // ─── Errors ─────────────────────────────────────────────────────────────────

  /**
   * An error carrying the HTTP status and the parsed server payload, so callers
   * can branch on 401/403/404 without re-parsing a message string.
   */
  class ApiError extends Error {
    constructor(message, { status = 0, payload = null, path = '' } = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.payload = payload;
      this.path = path;
    }
  }

  // ─── Core request ───────────────────────────────────────────────────────────

  /**
   * @param {string} path   Path beginning with `/`, relative to `base`.
   * @param {object} options
   * @param {string} [options.method='GET']
   * @param {object} [options.body]     JSON-serialized automatically.
   * @param {FormData} [options.form]   Sent as-is for multipart uploads.
   * @param {boolean} [options.auth=true] Attach the bearer token.
   * @param {boolean} [options.raw=false] Return the whole envelope instead of `data`.
   * @param {AbortSignal} [options.signal]
   * @param {string} [options.base='/api'] Path prefix under the origin.
   */
  async function request(path, options = {}) {
    const {
      method = 'GET',
      body,
      form,
      auth = true,
      raw = false,
      signal,
      base = '/api',
      headers: extraHeaders
    } = options;

    const url = ORIGIN + base + path;

    const headers = Object.assign({}, extraHeaders);

    // A FormData body must not receive an explicit Content-Type: the browser has
    // to set it itself so the multipart boundary matches the body it generates.
    if (body !== undefined && body !== null) {
      headers['Content-Type'] = 'application/json';
    }

    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
      response = await global.fetch(url, {
        method,
        headers,
        signal,
        body: form !== undefined ? form
          : body !== undefined && body !== null ? JSON.stringify(body)
            : undefined
      });
    } catch (networkError) {
      if (networkError && networkError.name === 'AbortError') throw networkError;
      throw new ApiError(
        `Cannot reach the ZERA server at ${ORIGIN}. Check that the backend is running.`,
        { path: url }
      );
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok || (payload && payload.success === false)) {
      const message = (payload && payload.message)
        || `Request failed with status ${response.status}.`;
      const error = new ApiError(message, { status: response.status, payload, path: url });

      // An expired or revoked token must not leave a half-authenticated UI
      // behind. Clear the session so the next guard redirects to login instead
      // of looping on stale state.
      if (response.status === 401 && auth && isLoggedIn()) {
        clearSession();
      }

      throw error;
    }

    return raw ? payload : (payload ? payload.data : null);
  }

  // ─── Endpoint groups ────────────────────────────────────────────────────────
  // Each returns the unwrapped `data`, matching what the old per-file helpers
  // returned, so call sites do not change shape.

  const auth = {
    signup: (body) => request('/auth/signup', { method: 'POST', body, auth: false, raw: true }),
    login: (body) => request('/auth/login', { method: 'POST', body, auth: false, raw: true }),
    adminLogin: (body) => request('/auth/admin/login', { method: 'POST', body, auth: false, raw: true }),
    forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body, auth: false, raw: true }),
    resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body, auth: false, raw: true }),
    me: () => request('/auth/me')
  };

  const onboarding = {
    get: () => request('/onboarding'),
    saveProfile: (body) => request('/onboarding/profile', { method: 'PUT', body }),
    uploadSyllabus: (form) => request('/onboarding/syllabus', { method: 'POST', form })
  };

  const courses = {
    catalog: () => request('/catalog'),
    dashboard: () => request('/dashboard'),
    detail: (courseId) => request(`/courses/${courseId}`),
    progress: (courseId) => request(`/courses/${courseId}/progress`),
    lessons: (courseId) => request(`/courses/${courseId}/lessons`),
    enroll: (courseId) => request(`/courses/${courseId}/enroll`, { method: 'POST' }),
    completeLesson: (courseId, lessonId) =>
      request(`/courses/${courseId}/lessons/${lessonId}/complete`, { method: 'POST' })
  };

  const student = {
    profile: () => request('/student/profile'),
    updateProfile: (body) => request('/student/profile', { method: 'PATCH', body }),
    notes: () => request('/student/notes'),
    createNote: (body) => request('/student/notes', { method: 'POST', body }),
    updateNote: (id, body) => request(`/student/notes/${id}`, { method: 'PATCH', body }),
    deleteNote: (id) => request(`/student/notes/${id}`, { method: 'DELETE' }),
    handwrittenNotes: () => request('/student/handwritten-notes'),
    createHandwrittenNote: (body) => request('/student/handwritten-notes', { method: 'POST', body }),
    updateHandwrittenNote: (id, body) => request(`/student/handwritten-notes/${id}`, { method: 'PATCH', body }),
    deleteHandwrittenNote: (id) => request(`/student/handwritten-notes/${id}`, { method: 'DELETE' }),
    bookmarks: () => request('/student/bookmarks'),
    createBookmark: (body) => request('/student/bookmarks', { method: 'POST', body }),
    deleteBookmark: (id) => request(`/student/bookmarks/${id}`, { method: 'DELETE' }),
    notifications: () => request('/student/notifications'),
    markNotificationRead: (id) => request(`/student/notifications/${id}/read`, { method: 'PATCH' }),
    markAllNotificationsRead: () => request('/student/notifications/read-all', { method: 'PATCH' }),
    settings: () => request('/student/settings'),
    saveSettings: (body) => request('/student/settings', { method: 'PUT', body }),
    quizzes: () => request('/student/quizzes'),
    submitQuizAttempt: (quizId, body) => request(`/student/quizzes/${quizId}/attempts`, { method: 'POST', body }),
    mockTests: () => request('/student/mock-tests'),
    submitMockTestAttempt: (id, body) => request(`/student/mock-tests/${id}/attempts`, { method: 'POST', body }),
    studyPlans: () => request('/student/study-plans'),
    createStudyPlan: (body) => request('/student/study-plans', { method: 'POST', body }),
    updateStudyPlan: (id, body) => request(`/student/study-plans/${id}`, { method: 'PATCH', body }),
    deleteStudyPlan: (id) => request(`/student/study-plans/${id}`, { method: 'DELETE' }),
    pyqs: () => request('/student/pyqs'),
    supportRequests: () => request('/student/support-requests'),
    createSupportRequest: (body) => request('/student/support-requests', { method: 'POST', body }),
    assessmentSummary: () => request('/student/assessment-summary')
  };

  const support = {
    list: () => request('/student/support-requests'),
    create: (body) => request('/student/support-requests', { method: 'POST', body })
  };

  const ai = {
    status: () => request('/ai/status'),
    doubtSolver: (body) => request('/ai/doubt-solver', { method: 'POST', body }),
    notes: (body) => request('/ai/notes', { method: 'POST', body }),
    quiz: (body) => request('/ai/quiz', { method: 'POST', body }),
    studyPlan: (body) => request('/ai/study-plan', { method: 'POST', body }),
    mockInterview: (body) => request('/ai/mock-interview', { method: 'POST', body }),
    analyzeSyllabus: (body) => request('/ai/analyze-syllabus', { method: 'POST', body })
  };

  const admin = {
    stats: () => request('/admin/stats'),
    /**
     * @param {object} [params]
     * @param {string} [params.role]    STUDENT | ADMIN | SUPER_ADMIN
     * @param {string} [params.status]  ACTIVE | SUSPENDED
     * @param {string} [params.search]   Name or email fragment
     */
    users: (params = {}) => {
      const query = new URLSearchParams();
      if (params.role) query.set('role', params.role);
      if (params.status) query.set('status', params.status);
      if (params.search) query.set('search', params.search);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      return request(`/admin/users${suffix}`);
    },
    suspendUser: (id) => request(`/admin/users/${id}/suspend`, { method: 'PATCH' }),
    restoreUser: (id) => request(`/admin/users/${id}/restore`, { method: 'PATCH' }),
    deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
    updateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
    invites: (status) => request(`/admin/invites${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    createInvite: (body) => request('/admin/invites', { method: 'POST', body }),
    approveInvite: (id, body) => request(`/admin/invites/${id}/approve`, { method: 'POST', body }),
    revokeInvite: (id) => request(`/admin/invites/${id}/revoke`, { method: 'POST' }),
    decidedInvites: () => request('/admin/invites/decided'),
    aiConfig: () => request('/admin/ai-config')
  };

  global.ZeraApi = {
    // Config
    ORIGIN,
    ApiError,

    // Session
    getToken,
    setToken,
    getUser,
    setUser,
    clearSession,
    isLoggedIn,

    // Escape hatch for routes not wrapped above.
    request,

    // Endpoint groups
    auth,
    onboarding,
    courses,
    student,
    support,
    ai,
    admin
  };
})(window);
