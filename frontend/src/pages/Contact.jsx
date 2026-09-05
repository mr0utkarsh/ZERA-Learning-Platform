import React, { useState } from 'react';
import { api } from '../services/api';
import { ErrorAlert } from '../components/ui';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const d = await api.post('/contact', form);
      setResult(d?.delivered
        ? 'Message sent. We will get back to you soon.'
        : 'Thanks for your message! Email delivery is not configured on this server yet, so it could not be delivered. Please try again later.');
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setError(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="section" style={{ maxWidth: 640 }}>
      <h2>Contact us</h2>
      <p className="sub" style={{ textAlign: 'left' }}>
        Questions, feedback or partnership ideas — write to the ZERA team.
      </p>
      <form className="card" onSubmit={submit}>
        <ErrorAlert error={error} />
        {result && <div className="alert alert-info">{result}</div>}
        <div className="field">
          <label htmlFor="c-name">Your name</label>
          <input id="c-name" className="input" value={form.name} onChange={set('name')} required maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="c-email">Email</label>
          <input id="c-email" type="email" className="input" value={form.email} onChange={set('email')} required maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor="c-msg">Message</label>
          <textarea id="c-msg" className="textarea" rows={5} value={form.message} onChange={set('message')} required minLength={10} maxLength={3000} />
        </div>
        <button className="btn btn-primary" disabled={sending}>
          {sending ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  );
}
