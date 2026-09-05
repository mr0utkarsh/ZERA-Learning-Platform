import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ErrorAlert, PageSpinner } from '../../components/ui';

const PROVIDERS = [
  { id: 'none', label: 'None (AI features disabled)' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'groq', label: 'Groq' },
];

const KEY_PROVIDERS = ['openai', 'gemini', 'groq'];

const LABELS = { openai: 'OpenAI', gemini: 'Google Gemini', groq: 'Groq' };
const KEY_HINTS = {
  openai: 'Starts with “sk-…”',
  gemini: 'From Google AI Studio',
  groq: 'Starts with “gsk_…”',
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const [provider, setProvider] = useState('none');
  const [model, setModel] = useState('');
  const [keys, setKeys] = useState({ openai: '', gemini: '', groq: '' });
  const [reveal, setReveal] = useState({ openai: false, gemini: false, groq: false });

  const load = () =>
    api
      .get('/admin/settings')
      .then((d) => {
        const s = d.settings;
        setSettings(s);
        setProvider(s.provider || 'none');
        setModel(s.model || '');
        setError(null);
      })
      .catch(setError);

  useEffect(() => {
    load();
  }, []);

  if (!settings && !error) return <PageSpinner label="Loading settings…" />;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const payload = { provider, model: model.trim() };
      // Only send keys the admin actually typed — blanks mean "keep as is".
      const typed = {};
      for (const p of KEY_PROVIDERS) if (keys[p].trim()) typed[p] = keys[p].trim();
      if (Object.keys(typed).length) payload.keys = typed;
      const d = await api.put('/admin/settings', payload);
      setSettings(d.settings);
      setProvider(d.settings.provider);
      setModel(d.settings.model || '');
      setKeys({ openai: '', gemini: '', groq: '' });
      setNotice('API configuration saved. Keys are stored encrypted and are never shown again.');
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const removeKey = async (p) => {
    if (!window.confirm(`Remove the stored ${LABELS[p]} API key from the server?`)) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const d = await api.put('/admin/settings', {
        provider: settings.provider,
        model: settings.model || '',
        removeKeys: [p],
      });
      setSettings(d.settings);
      setProvider(d.settings.provider);
      setNotice(`${LABELS[p]} key removed.`);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const defaults = settings?.defaults || {};

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Server configuration for administrators.</p>
        </div>
      </div>

      <ErrorAlert error={error} onRetry={load} />
      {notice && (
        <div className="alert alert-success" role="status" style={{ marginBottom: 14 }}>
          ✅ {notice}
        </div>
      )}

      {settings && (
        <form onSubmit={save} className="card" style={{ maxWidth: 720 }}>
          <h3>API Configuration</h3>
          <p className="small muted">
            Configure the AI service used by notes, doubts, quizzes, study plans and interviews.
            {settings.source === 'env'
              ? ' Currently using environment-variable defaults — saving here takes over.'
              : ' Currently using admin-saved configuration.'}
          </p>

          <div className="flex" style={{ alignItems: 'center', gap: 10, margin: '14px 0', flexWrap: 'wrap' }}>
            <span className="small" style={{ fontWeight: 600 }}>Status:</span>
            {settings.configured ? (
              <span className="badge badge-green">AI configured — {PROVIDERS.find((p) => p.id === settings.provider)?.label || settings.provider}</span>
            ) : (
              <span className="badge badge-gray">AI not configured — AI features return an honest “not configured” state</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="ai-provider">Active AI provider</label>
            <select id="ai-provider" className="select" value={provider} onChange={(e) => setProvider(e.target.value)}>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <div className="hint">The active provider’s key is the only one sent to its own service endpoint.</div>
          </div>

          <div className="field">
            <label htmlFor="ai-model">Model override <span className="muted">(optional)</span></label>
            <input
              id="ai-model"
              className="input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={`Default for ${provider}: ${defaults[provider]?.model || '—'}`}
              autoComplete="off"
              maxLength={120}
            />
            <div className="hint">Leave blank to use the provider default{defaults[provider]?.model ? ` (${defaults[provider].model})` : ''}.</div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line-soft)', margin: '18px 0' }} />

          {KEY_PROVIDERS.map((p) => {
            const stored = settings.keys?.[p];
            return (
              <div className="field" key={p}>
                <label htmlFor={`key-${p}`}>
                  {LABELS[p]} API key{' '}
                  {stored?.set ? <span className="badge badge-green">saved</span> : <span className="badge badge-gray">not set</span>}
                </label>
                {stored?.set && !keys[p] && (
                  <div className="small muted" style={{ marginBottom: 6 }}>
                    Stored key: <code>{stored.masked}</code> — the full key is never displayed again.
                  </div>
                )}
                <div className="flex" style={{ gap: 8 }}>
                  <input
                    id={`key-${p}`}
                    className="input grow"
                    type={reveal[p] ? 'text' : 'password'}
                    value={keys[p]}
                    onChange={(e) => setKeys((k) => ({ ...k, [p]: e.target.value }))}
                    placeholder={stored?.set ? 'Leave blank to keep the current key' : KEY_HINTS[p]}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={300}
                  />
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setReveal((r) => ({ ...r, [p]: !r[p] }))} aria-label={reveal[p] ? 'Hide key while typing' : 'Show key while typing'}>
                    {reveal[p] ? 'Hide' : 'Show'}
                  </button>
                  {stored?.set && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeKey(p)} disabled={saving}>
                      Remove
                    </button>
                  )}
                </div>
                <div className="hint">Keys are encrypted on the server and are only ever used for the {LABELS[p]} API.</div>
              </div>
            );
          })}

          <div className="flex" style={{ gap: 10, alignItems: 'center', marginTop: 6 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save configuration'}
            </button>
            <span className="small muted">Changes apply immediately — no restart needed.</span>
          </div>
        </form>
      )}

      {settings && (
        <p className="small muted" style={{ maxWidth: 720, marginTop: 14 }}>
          🔒 Security: API keys are stored AES-256-GCM encrypted in the database, are never sent to the browser,
          never appear in logs, and only the masked form (first/last few characters) is ever shown here.
        </p>
      )}
    </div>
  );
}
