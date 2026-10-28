import React, { useEffect, useState } from 'react';
import { API_BASE_URL, api } from '../../services/api';

const PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.49 4.49 0 0 1-1.95 2.95v2.42h3.16c1.85-1.7 2.9-4.2 2.9-7.24Z"/><path fill="#34A853" d="M12 21.6c2.65 0 4.87-.88 6.5-2.37l-3.16-2.42c-.88.59-2 .94-3.34.94-2.56 0-4.72-1.73-5.5-4.06H3.23v2.5A9.82 9.82 0 0 0 12 21.6Z"/><path fill="#FBBC05" d="M6.5 13.69a5.9 5.9 0 0 1 0-3.38v-2.5H3.23a9.82 9.82 0 0 0 0 8.38l3.27-2.5Z"/><path fill="#EA4335" d="M12 6.25c1.45 0 2.75.5 3.77 1.5l2.83-2.82A9.46 9.46 0 0 0 12 2.4a9.82 9.82 0 0 0-8.77 5.41l3.27 2.5c.78-2.33 2.94-4.06 5.5-4.06Z"/></svg>,
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .8a11.2 11.2 0 0 0-3.54 21.82c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 .1.75 2.48 3.4 1.78.1-.73.4-1.23.71-1.52-2.5-.29-5.13-1.25-5.13-5.57 0-1.23.44-2.24 1.16-3.03-.12-.29-.5-1.43.1-2.98 0 0 .95-.3 3.08 1.16a10.7 10.7 0 0 1 5.6 0C17.05 5.85 18 6.15 18 6.15c.6 1.55.22 2.69.1 2.98.72.79 1.16 1.8 1.16 3.03 0 4.33-2.64 5.28-5.16 5.56.4.35.76 1.04.76 2.1v2.26c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z"/></svg>,
  },
];

export default function SocialAuth({ mode = 'login' }) {
  const [available, setAvailable] = useState({});
  const [checked, setChecked] = useState(false);
  const verb = mode === 'signup' ? 'Sign up' : 'Continue';

  useEffect(() => {
    let active = true;
    api.get('/auth/oauth/providers')
      .then((result) => { if (active) setAvailable(result.providers || {}); })
      .catch(() => { if (active) setAvailable({}); })
      .finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, []);

  const enabledCount = PROVIDERS.filter((provider) => available[provider.id]).length;
  return (
    <div className="social-auth">
      <div className="social-auth-buttons">
        {PROVIDERS.map((provider) => {
          const enabled = Boolean(available[provider.id]);
          return (
            <button
              className="social-auth-button"
              type="button"
              key={provider.id}
              disabled={!checked || !enabled}
              onClick={() => { if (enabled) window.location.assign(`${API_BASE_URL}/api/auth/oauth/${provider.id}`); }}
              aria-label={`${verb} with ${provider.label}${!enabled ? ' (not configured)' : ''}`}
              title={enabled ? `${verb} with ${provider.label}` : `${provider.label} sign-in is not configured on this server`}
            >
              {provider.icon}<span>{provider.label}</span>{checked && !enabled && <small>NOT SET UP</small>}
            </button>
          );
        })}
      </div>
      {checked && !enabledCount && <p className="social-auth-note">Google and GitHub sign-in are not configured yet. Continue with your email, or ask the site administrator to set up OAuth.</p>}
    </div>
  );
}
