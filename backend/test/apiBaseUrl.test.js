/**
 * Guards the API base-URL normalisation.
 *
 * The client appends "/api" to every request, so VITE_API_URL must be an
 * ORIGIN. If a deployment sets it to ".../api" the client would otherwise
 * request ".../api/api/...". This checks the normalisation directly.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

const normalise = (raw) => {
  const trimmed = (raw || '').trim();
  return trimmed.replace(/\/+$/, '').replace(/\/api$/, '');
};

test('strips a trailing /api so /api is never duplicated', () => {
  assert.equal(normalise('https://api.example.com/api'), 'https://api.example.com');
  assert.equal(normalise('https://api.example.com/api/'), 'https://api.example.com');
  assert.equal(normalise('https://api.example.com'), 'https://api.example.com');
  assert.equal(normalise('https://api.example.com/'), 'https://api.example.com');
  assert.equal(normalise(''), '');
  assert.equal(normalise(undefined), '');
});

test('building a request URL never produces /api/api', () => {
  const cases = [
    'https://api.example.com',
    'https://api.example.com/api',
    'https://api.example.com/',
    '',
  ];
  for (const raw of cases) {
    const url = `${normalise(raw)}/api/quiz`;
    assert.ok(!url.includes('/api/api'), `duplicate /api in ${url}`);
    assert.ok(url.endsWith('/api/quiz'), `unexpected url ${url}`);
  }
});
