import React from 'react';
import { Link } from 'react-router-dom';

export function Spinner({ lg }) {
  return <span className={`spinner${lg ? ' lg' : ''}`} role="status" aria-label="Loading" />;
}

export function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div className="loading-screen" aria-busy="true">
      <Spinner lg />
      <div>{label}</div>
    </div>
  );
}

export function PageSpinner({ label }) {
  return <div className="card mt-20"><LoadingScreen label={label} /></div>;
}

export function ErrorAlert({ error, onRetry }) {
  if (!error) return null;
  const msg = error.message || String(error);
  return (
    <div className="alert alert-error" role="alert">
      <div className="grow">{msg}</div>
      {onRetry && <button className="btn btn-sm btn-outline" onClick={onRetry}>Retry</button>}
    </div>
  );
}

/** Clear, honest notice when an optional external service isn't configured. */
export function ServiceNotice({ service = 'AI features', hint }) {
  return (
    <div className="alert alert-warn" role="note">
      <div>
        <b>{service} are not configured on this server yet.</b>
        <div className="small mt-12" style={{ marginTop: 4 }}>
          {hint || 'An administrator needs to add an API key in Admin Panel → Settings → API Configuration to enable them.'}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon = '📭', title, message, actionLabel, actionTo, actionOnClick }) {
  return (
    <div className="state-center">
      <div className="icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {actionTo && <Link className="btn btn-primary" to={actionTo}>{actionLabel}</Link>}
      {actionOnClick && <button className="btn btn-primary" onClick={actionOnClick}>{actionLabel}</button>}
    </div>
  );
}

export function ProgressBar({ value = 0, green, label, showLabel = true }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="progress-track" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <div className={`progress-fill${green ? ' green' : ''}`} style={{ width: `${v}%` }} />
      </div>
      {showLabel && label !== undefined && (
        <div className="progress-label"><span>{label}</span><span>{v}%</span></div>
      )}
    </div>
  );
}

export function StatCard({ label, value, foot }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {foot && <div className="foot">{foot}</div>}
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb-12">
          <h3 className="mb-0">{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Avatar({ name, color = '#6c5ce7', size }) {
  const initials = String(name || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="avatar" style={{ background: color, width: size, height: size }} aria-hidden="true">
      {initials}
    </div>
  );
}
