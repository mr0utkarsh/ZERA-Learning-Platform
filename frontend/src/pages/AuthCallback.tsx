import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { apiUrl, tokenStore } from '../lib/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage(decodeURIComponent(error));
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (token) {
      // Store the token and fetch user profile
      tokenStore.set(token);
      fetch(`${apiUrl('/auth/me')}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to load profile');
          await res.json();
          window.history.replaceState({}, document.title, window.location.pathname);
          setStatus('success');
          setMessage('Sign-in complete. Redirecting…');
          setTimeout(() => navigate('/dashboard'), 800);
        })
        .catch(() => {
          setStatus('error');
          setMessage('Sign-in failed. Please try again.');
        });
    } else {
      setStatus('error');
      setMessage('No sign-in token found.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-void text-fg flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Logo variant="primary" className="h-10 mx-auto mb-6" showWordmark />
        {status === 'idle' && (
          <div className="animate-spin h-8 w-8 border-4 border-muted border-t-fg rounded-full mx-auto mb-4" />
        )}
        {status === 'success' && (
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 mx-auto mb-4">
            <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {status === 'error' && (
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mx-auto mb-4">
            <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        {message && (
          <p className={`text-sm font-medium mb-4 ${status === 'success' ? 'text-success' : 'text-error'}`}>
            {message}
          </p>
        )}
        {status === 'error' && (
          <p className="text-xs text-muted">
            <a href="/login" className="text-violet-300 hover:underline">Return to sign in</a>
          </p>
        )}
      </div>
    </div>
  );
}