import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ErrorAlert } from '../components/ui';

export default function Settings() {
  const { user, refresh } = useAuth();
  const prefs = user?.preferences || {};
  const [dailyGoal, setDailyGoal] = useState(prefs.dailyGoalMinutes || 60);
  const [theme, setTheme] = useState(prefs.theme || 'light');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      await api.patch('/users/profile', { preferences: { ...prefs, dailyGoalMinutes: Number(dailyGoal), theme } });
      await refresh();
      setMsg('Preferences saved.');
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Account preferences.</p>
        </div>
      </div>
      <ErrorAlert error={error} />
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card mb-12">
        <h3>Study preferences</h3>
          <div className="field">
            <label htmlFor="s-goal">Daily study goal (minutes)</label>
            <input id="s-goal" type="number" className="input" min={10} max={600} value={dailyGoal} onChange={(e) => setDailyGoal(e.target.value)} />
            <div className="hint">Used as guidance on your dashboard and study plans.</div>
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button>
      </div>

      <div className="card">
        <h3>Email verification</h3>
        {user?.emailVerified ? (
          <div className="alert alert-success mb-0">Your email address is verified ✓</div>
        ) : (
          <p className="muted mb-0">Your email isn’t verified yet. <a href="/verify-email">Verify it now</a> to secure your account.</p>
        )}
      </div>
    </div>
  );
}
