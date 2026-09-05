import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import Markdown from '../components/Markdown';
import { ErrorAlert, PageSpinner } from '../components/ui';
import { fmtDuration } from '../utils/format';

const fmtClock = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

function QuestionCard({ q, value, onChange, review }) {
  const isShort = q.type === 'SHORT_ANSWER';
  if (review) {
    const given = q.given;
    const correctIdx = q.correctIndex;
    return (
      <div className="q-card">
        <div className="q-num">Question {q.index + 1} · {q.type.replace('_', ' / ')}</div>
        <div className="q-text">{q.text}</div>
        {!isShort ? q.choices.map((c, i) => {
          let cls = 'option';
          if (i === correctIdx) cls += ' correct';
          else if (i === given) cls += ' wrong';
          return (
            <div className={cls} key={i}>
              <span className="key">{String.fromCharCode(65 + i)}</span>
              <span>{c}</span>
              {i === correctIdx && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Correct answer</span>}
              {i === given && i !== correctIdx && <span className="badge badge-red" style={{ marginLeft: 'auto' }}>Your answer</span>}
              {i === given && i === correctIdx && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Your answer ✓</span>}
            </div>
          );
        }) : (
          <>
            <div className="card card-tight mb-12">
              <b className="small">Your answer:</b>
              <p className="mb-0" style={{ marginTop: 4 }}>{given || <i className="muted">Not answered</i>}</p>
            </div>
            {q.modelAnswer && (
              <div className="card card-tight" style={{ background: 'var(--success-soft)', borderColor: '#bbf7d0' }}>
                <b className="small">Model answer:</b>
                <p className="mb-0" style={{ marginTop: 4 }}>{q.modelAnswer}</p>
              </div>
            )}
          </>
        )}
        {review && q.explanation && (
          <div className="alert alert-info" style={{ marginTop: 12, marginBottom: 0 }}>
            <div><b>Explanation:</b> {q.explanation}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="q-card">
      <div className="q-num">Question {q.index + 1} · {q.type.replace('_', ' / ')}</div>
      <div className="q-text">{q.text}</div>
      {!isShort ? q.choices.map((c, i) => (
        <div key={i} className={`option${value === i ? ' selected' : ''}`} onClick={() => onChange(i)}
          role="radio" aria-checked={value === i} tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(i); } }}>
          <span className="key">{String.fromCharCode(65 + i)}</span>
          <span>{c}</span>
        </div>
      )) : (
        <textarea className="textarea" rows={4} value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your answer… (short answers are shown with a model answer after submission)"
          aria-label="Short answer" />
      )}
    </div>
  );
}

export default function QuizRunner({ review }) {
  const { quizId, attemptId } = useParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState(review ? 'review' : 'loading');
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(null);
  const [result, setResult] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef(Date.now());
  const saveTimer = useRef(null);
  const answersRef = useRef([]);

  // ----- Load (run mode) -----
  useEffect(() => {
    if (review) {
      api.get(`/quizzes/attempts/${attemptId}/review`)
        .then((d) => { setReviewData(d); setMode('review'); })
        .catch((e) => { setError(e); setMode('error'); });
      return;
    }
    (async () => {
      try {
        const qd = await api.get(`/quizzes/${quizId}`);
        setQuiz(qd.quiz);
        setQuestions(qd.quiz.questions);
        const ad = await api.post(`/quizzes/${quizId}/attempts`);
        setAttempt(ad.attempt);
        startedAt.current = ad.attempt.startedAt ? new Date(ad.attempt.startedAt).getTime() : Date.now();
        const saved = Array.isArray(ad.attempt.answers) ? ad.attempt.answers : [];
        const filled = qd.quiz.questions.map((_, i) => saved[i] ?? null);
        setAnswers(filled);
        answersRef.current = filled;
        if (qd.quiz.timeLimitMin) {
          const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
          setRemaining(Math.max(0, qd.quiz.timeLimitMin * 60 - elapsed));
        }
        setMode('run');
      } catch (e) {
        setError(e);
        setMode('error');
      }
    })();
  }, [quizId, attemptId, review]);

  const persistAnswers = useCallback((next) => {
    answersRef.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (attempt?.id) api.post(`/quizzes/attempts/${attempt.id}/answers`, { answers: answersRef.current }).catch(() => {});
    }, 800);
  }, [attempt?.id]);

  const submit = useCallback(async (auto = false) => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      const timeTakenSec = Math.round((Date.now() - startedAt.current) / 1000);
      const d = await api.post(`/quizzes/attempts/${attempt.id}/submit`, {
        answers: answersRef.current,
        timeTakenSec,
        autoSubmitted: auto,
      });
      setResult(d);
      setMode('result');
    } catch (e) {
      setError(e);
    } finally {
      setSubmitting(false);
    }
  }, [attempt, submitting]);

  // ----- Timer -----
  useEffect(() => {
    if (mode !== 'run' || remaining === null) return;
    if (remaining <= 0) { submit(true); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [mode, remaining, submit]);

  if (mode === 'loading') return <PageSpinner label="Preparing your quiz…" />;
  if (mode === 'error') return <div className="page"><ErrorAlert error={error} /><Link className="btn btn-outline" to="/quiz">Back to quizzes</Link></div>;

  // ----- Review mode -----
  if (mode === 'review' && reviewData) {
    const a = reviewData.attempt;
    return (
      <div className="page" style={{ maxWidth: 860 }}>
        <div className="page-head">
          <div>
            <h1>Review — {reviewData.quiz.title}</h1>
            <p className="sub">Score {a.score}/{a.total} · {a.percentage}% · time {fmtDuration(a.timeTakenSec)}</p>
          </div>
          <Link className="btn btn-outline" to={reviewData.quiz.type === 'MOCK_TEST' ? '/tests' : '/quiz'}>Back</Link>
        </div>
        {reviewData.questions.map((q) => <QuestionCard key={q.index} q={q} review />)}
      </div>
    );
  }

  // ----- Result mode -----
  if (mode === 'result' && result) {
    const a = result.attempt;
    const details = result.details || [];
    return (
      <div className="page" style={{ maxWidth: 720 }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 46 }} aria-hidden="true">{a.percentage >= 70 ? '🎉' : a.percentage >= 40 ? '💪' : '📖'}</div>
          <h1 style={{ margin: '8px 0' }}>{quiz?.title}</h1>
          <p className="muted">Submitted{result.auto ? ' automatically (time expired)' : ''} — here’s how you did.</p>
          <div className="grid grid-3 mt-20">
            <div className="stat-card"><div className="label">Score</div><div className="value">{a.percentage}%</div></div>
            <div className="stat-card"><div className="label">Correct</div><div className="value" style={{ color: 'var(--success)' }}>{a.correctCount}</div></div>
            <div className="stat-card"><div className="label">Incorrect</div><div className="value" style={{ color: 'var(--danger)' }}>{a.incorrectCount}</div></div>
          </div>
          <p className="small muted mt-20 mb-0">Time taken: {fmtDuration(a.timeTakenSec)} · {details.filter((d) => d.autoCorrect === null).length} short-answer question(s) shown with model answers</p>
          <div className="flex mt-20" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" to={`/${quiz.type === 'MOCK_TEST' ? 'tests' : 'quiz'}/review/${a.id}`}>Review answers</Link>
            <Link className="btn btn-outline" to={quiz.type === 'MOCK_TEST' ? '/tests' : '/quiz'}>Done</Link>
          </div>
        </div>
      </div>
    );
  }

  // ----- Run mode -----
  const q = questions[current];
  const answeredCount = answers.filter((a) => a !== null && a !== undefined && a !== '').length;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="flex-between mb-12">
        <div>
          <h1 style={{ fontSize: 20, margin: 0 }}>{quiz.title}</h1>
          <span className="small muted">{answeredCount}/{questions.length} answered · answers save automatically</span>
        </div>
        <div className="flex">
          {remaining !== null && (
            <span className={`timer${remaining < 120 ? ' low' : ''}`} aria-live="polite">⏱ {fmtClock(remaining)}</span>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => navigate(quiz.type === 'MOCK_TEST' ? '/tests' : '/quiz')}>Save & exit</button>
        </div>
      </div>
      <ErrorAlert error={error} />

      <QuestionCard q={q} value={answers[current]}
        onChange={(v) => {
          const next = [...answers];
          next[current] = v;
          setAnswers(next);
          persistAnswers(next);
        }} />

      <div className="card card-tight flex-between">
        <button className="btn btn-outline btn-sm" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← Previous</button>
        <div className="palette" role="tablist" aria-label="Question navigation">
          {questions.map((_, i) => (
            <button key={i} className={`${i === current ? 'current' : ''} ${answers[i] !== null && answers[i] !== undefined && answers[i] !== '' ? 'answered' : ''}`}
              onClick={() => setCurrent(i)} aria-label={`Go to question ${i + 1}`}>{i + 1}</button>
          ))}
        </div>
        {current < questions.length - 1 ? (
          <button className="btn btn-primary btn-sm" onClick={() => setCurrent(current + 1)}>Next →</button>
        ) : (
          <button className="btn btn-success btn-sm" onClick={() => submit(false)} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        )}
      </div>
      <div className="text-right mt-12">
        <button className="btn btn-success" onClick={() => submit(false)} disabled={submitting}>
          {submitting ? 'Submitting…' : `Submit ${quiz.type === 'MOCK_TEST' ? 'test' : 'quiz'}`}
        </button>
      </div>
    </div>
  );
}
