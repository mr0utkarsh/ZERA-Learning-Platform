/**
 * Thin API client. All requests go to /api which the dev server (or a
 * reverse proxy in production) forwards to the backend. Auth travels in
 * an httpOnly cookie — no tokens in JS memory/localStorage.
 */
const API_BASE_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(method, path, body, isForm = false) {
  const options = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (body !== undefined) {
    if (isForm) {
      options.body = body; // FormData
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, options);
  } catch {
    throw new ApiClientError('Cannot reach the server. Please check your connection.', 0);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const err = new ApiClientError(data?.message || `Request failed (${res.status})`, res.status);
    err.code = data?.code;
    err.details = data?.details;
    throw err;
  }
  return data?.data;
}

export class ApiClientError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  postForm: (p, form) => request('POST', p, form, true),
  put: (p, b) => request('PUT', p, b),
  patch: (p, b) => request('PATCH', p, b),
  delete: (p) => request('DELETE', p),
};
