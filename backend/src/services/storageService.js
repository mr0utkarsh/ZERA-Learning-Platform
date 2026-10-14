import { env } from '../config/env.js';

/**
 * Private file storage backed by Supabase Storage (Section 5/7).
 *
 * All calls use the service-role key on the SERVER only; the key is never sent
 * to a browser. Buckets are private, so files are reached only through
 * short-lived signed URLs minted on demand. When Supabase is not configured the
 * service reports `configured: false` and callers degrade honestly instead of
 * pretending an upload succeeded.
 */
export const storageService = {
  isConfigured() {
    return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  },

  /** Uploads bytes to a private bucket and returns the object path. */
  async upload({ bucket, path, bytes, contentType }) {
    if (!this.isConfigured()) {
      const err = new Error('File storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
      err.statusCode = 503;
      throw err;
    }
    const url = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${bucket}/${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': contentType || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: bytes
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      const err = new Error(`Storage upload failed (${res.status}). ${detail}`.slice(0, 300));
      err.statusCode = 502;
      throw err;
    }
    return { bucket, path };
  },

  /** Mints a short-lived signed URL for a private object. */
  async createSignedUrl({ bucket, path, expiresIn }) {
    if (!this.isConfigured()) {
      const err = new Error('File storage is not configured.');
      err.statusCode = 503;
      throw err;
    }
    const url = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/sign/${bucket}/${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn: expiresIn || env.SIGNED_URL_EXPIRES_IN })
    });
    if (!res.ok) {
      const err = new Error(`Could not create a signed URL (${res.status}).`);
      err.statusCode = 502;
      throw err;
    }
    const data = await res.json();
    const signedPath = data.signedURL || data.signedUrl;
    return `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1${signedPath}`;
  },

  /** Deletes a private object. */
  async remove({ bucket, path }) {
    if (!this.isConfigured()) return;
    const url = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${bucket}/${path}`;
    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
    }).catch(() => {});
  }
};

/** Builds a per-user, collision-resistant object path (never user-controlled raw). */
export const buildObjectPath = (userId, kind, fileName) => {
  const safe = String(fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  return `${userId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
};
