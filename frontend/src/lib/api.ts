/**
 * Typed API client for the ZERA backend.
 *
 * The base URL comes from VITE_API_URL (the deployed Railway backend). In local
 * dev the Vite proxy forwards /api to the backend, so a relative base works too.
 * The bearer token is attached automatically and cleared on 401.
 */

/**
 * Normalised API origin.
 *
 * VITE_API_URL may be given as either the bare origin
 * (https://backend.example.com) or with a trailing /api segment
 * (https://backend.example.com/api). Stripping a trailing "/api" here means
 * every request can safely append "/api/..." exactly once, so we never end
 * up calling /api/api/... .
 */
const RAW_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '';

export const API_ORIGIN = RAW_BASE.replace(/\/+$/, '').replace(/\/api$/, '');

const BASE = API_ORIGIN;
const TOKEN_KEY = 'zera_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>)
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });
  if (res.status === 401) tokenStore.clear();

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    throw new ApiError(payload?.message || `Request failed (${res.status})`, res.status);
  }
  return (payload?.data ?? payload) as T;
}

const post = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });

const put = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });

const patch = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });

const get = <T,>(path: string) => request<T>(path);
const del = <T,>(path: string) => request<T>(path, { method: 'DELETE' });

/** Full URL for an API path, e.g. apiUrl('/quiz') -> "https://host/api/quiz". */
export const apiUrl = (path: string) => `${BASE}/api${path}`;

export const api = {
  auth: {
    signup: (body: { name: string; email: string; password: string }) => post<any>('/auth/signup', body),
    login: (body: { email: string; password: string }) => post<any>('/auth/login', body),
    adminLogin: (body: { email: string; password: string }) => post<any>('/auth/admin/login', body),
    me: () => get<any>('/auth/me'),
    forgotPassword: (email: string) => post<any>('/auth/forgot-password', { email }),
    resetPassword: (token: string, password: string) => post<any>('/auth/reset-password', { token, password })
  },
  admin: {
    stats: () => get<any>('/admin/stats'),
    aiConfig: () => get<any>('/admin/ai-config'),
    users: (params?: { role?: string; status?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.role) query.set('role', params.role);
      if (params?.status) query.set('status', params.status);
      if (params?.search) query.set('search', params.search);
      const qs = query.toString();
      return get<any>(`/admin/users${qs ? `?${qs}` : ''}`);
    },
    suspendUser: (id: string) => patch<any>(`/admin/users/${id}/suspend`, {}),
    restoreUser: (id: string) => patch<any>(`/admin/users/${id}/restore`, {}),
    deleteUser: (id: string) => del<any>(`/admin/users/${id}`),
    updateUserRole: (id: string, role: string) => patch<any>(`/admin/users/${id}/role`, { role }),
    invites: (status?: string) => get<any>(`/admin/invites${status ? `?status=${status}` : ''}`),
    decidedInvites: () => get<any>('/admin/invites/decided'),
    inviteAdmin: (body: { name: string; email: string; role?: string }) => post<any>('/admin/invites', body),
    approveInvite: (inviteId: string, body: { name?: string; password: string }) =>
      post<any>(`/admin/invites/${inviteId}/approve`, body),
    revokeInvite: (inviteId: string) => post<any>(`/admin/invites/${inviteId}/revoke`, {})
  },
  onboarding: {
    get: () => get<any>('/onboarding'),
    saveAcademic: (body: unknown) => put<any>('/onboarding/academic', body)
  },
  syllabus: {
    confirm: (body: unknown) => post<any>('/syllabus/confirm', body),
    list: () => get<any[]>('/syllabus'),
    get: (id: string) => get<any>(`/syllabus/${id}`)
  },
  progress: {
    init: (id: string) => post<any>(`/progress/syllabus/${id}/init`),
    get: (id: string) => get<any>(`/progress/syllabus/${id}`),
    setTopic: (topicId: string, status: string) => patch<any>(`/progress/topics/${topicId}`, { status })
  },
  studyPlans: {
    generate: (body: { syllabusId: string; examDate?: string; useAi?: boolean }) => post<any>('/study-plans', body),
    list: () => get<any[]>('/study-plans'),
    get: (id: string) => get<any>(`/study-plans/${id}`),
    summary: (id: string) => get<any>(`/study-plans/${id}/summary`),
    completeTask: (taskId: string) => patch<any>(`/study-plans/tasks/${taskId}/complete`),
    skipTask: (taskId: string) => patch<any>(`/study-plans/tasks/${taskId}/skip`)
  },
  quiz: {
    create: (body: unknown) => post<any>('/quiz', body),
    list: () => get<any[]>('/quiz'),
    get: (id: string) => get<any>(`/quiz/${id}`),
    submit: (id: string, answers: unknown) => post<any>(`/quiz/${id}/attempts`, { answers }),
    attempts: () => get<any[]>('/quiz/attempts')
  },
  doubts: {
    list: () => get<any[]>('/doubts'),
    ask: (body: { question: string; topicId?: string; style?: string }) => post<any>('/doubts', body),
    get: (id: string) => get<any>(`/doubts/${id}`)
  },
  interviews: {
    start: (body: { role: string; skills?: string[]; interviewType?: string }) => post<any>('/interviews', body),
    evaluate: (id: string, answers: unknown) => post<any>(`/interviews/${id}/evaluate`, { answers }),
    list: () => get<any[]>('/interviews')
  },
  performance: {
    get: () => get<any>('/performance')
  },
  resources: {
    list: () => get<any[]>('/resources'),
    recommended: () => get<any[]>('/resources/recommended'),
    bookmark: (id: string) => post<any>(`/resources/${id}/bookmark`, {}),
    bookmarks: () => get<any[]>('/resources/bookmarks/mine')
  },
  handwriting: {
    list: () => get<any[]>('/handwriting'),
    upload: (form: FormData) => post<any>('/handwriting', form),
    correct: (id: string, correctedText: string) => patch<any>(`/handwriting/${id}/correct`, { correctedText })
  },
  notes: {
    list: () => get<any[]>('/student/notes'),
    create: (body: { title: string; content: string; category?: string }) => post<any>('/student/notes', body),
    update: (id: string, body: { title?: string; content?: string }) => patch<any>(`/student/notes/${id}`, body),
    remove: (id: string) => del<any>(`/student/notes/${id}`)
  },
  pyqs: {
    list: () => get<any[]>('/student/pyqs')
  },
  ai: {
    // Generates quiz questions via the configured provider, then the client
    // persists them with quiz.create (validating structure server-side).
    generateQuiz: (body: { topic: string; difficulty?: string; count?: number }) => post<any>('/ai/quiz', body)
  }
};
