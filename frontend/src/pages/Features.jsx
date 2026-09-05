import React from 'react';
import { Link } from 'react-router-dom';

const GROUPS = [
  {
    title: 'Learn',
    items: [
      ['📚', 'Course hierarchy', 'Courses, subjects, units, chapters, topics and lessons — with objectives, content and personal notes.'],
      ['📤', 'Syllabus upload', 'Upload PDF/DOCX/TXT. The AI proposes a structure; you review and approve it before anything is saved.'],
      ['📈', 'Progress at every level', 'Completion percentages from lesson all the way up to course, computed from real completions.'],
    ],
  },
  {
    title: 'AI toolkit',
    items: [
      ['✍️', 'Notes generator', 'Structured notes with headings, key points, examples, important terms, summaries and exam focus.'],
      ['🖋️', 'Handwritten-style notes', 'Readable handwritten-style sheets to preview, save and download.'],
      ['💬', 'Doubt solver', 'A tutor that explains step by step, gives examples and asks follow-up questions. Full history kept.'],
    ],
  },
  {
    title: 'Practice',
    items: [
      ['❓', 'Quiz generator', 'MCQ, true/false and short-answer questions at your chosen difficulty, graded instantly.'],
      ['📝', 'Mock tests', 'Timed tests with question navigation, auto-submit and full post-submission analysis.'],
      ['🗂️', 'Previous-year questions', 'Search and filter by subject, year, exam, topic and difficulty. Bookmark and track attempts.'],
    ],
  },
  {
    title: 'Plan & improve',
    items: [
      ['🗓️', 'Study plans', 'Tell ZERA your daily minutes, preferred days and target date — get a persistent, checkable schedule.'],
      ['📊', 'Performance analytics', 'Accuracy, subject-wise averages, strong/weak areas and improvement trends from real attempts.'],
      ['🎤', 'Mock interviews', 'Role/domain/difficulty-based interviews with per-answer scoring and a final evaluation.'],
    ],
  },
];

export default function Features() {
  return (
    <div className="section">
      <h2>Features</h2>
      <p className="sub">A complete learning operating system for students.</p>
      {GROUPS.map((g) => (
        <div key={g.title} style={{ marginBottom: 34 }}>
          <h3 style={{ fontSize: 20, marginBottom: 14 }}>{g.title}</h3>
          <div className="grid grid-3">
            {g.items.map(([emoji, title, body]) => (
              <div className="feature-card" key={title}>
                <span className="emoji">{emoji}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ textAlign: 'center' }}>
        <Link className="btn btn-primary btn-lg" to="/signup">Start Learning</Link>
      </div>
    </div>
  );
}
