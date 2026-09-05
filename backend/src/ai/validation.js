/**
 * AI response validation. AI output is untrusted: every structured payload
 * is type-checked, clamped, and stripped of unexpected fields before use.
 * No AI output is ever executed or rendered as HTML.
 */

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strLong = (v, max = 20000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bool = (v) => v === true;

function validateQuizQuestions(raw, requestedCount) {
  if (!Array.isArray(raw)) throw new Error('AI response: questions must be an array');
  const questions = [];
  const max = Math.min(Math.max(requestedCount || 10, 1), 30);
  for (const q of raw.slice(0, max)) {
    if (!q || typeof q !== 'object') continue;
    const type = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'].includes(q.type) ? q.type : null;
    const text = str(q.question || q.text, 800);
    if (!type || !text) continue;

    if (type === 'MCQ') {
      const choices = Array.isArray(q.choices) ? q.choices.map((c) => str(c, 300)).filter(Boolean).slice(0, 6) : [];
      const correctIndex = parseInt(q.correctIndex, 10);
      if (choices.length < 2 || !Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) continue;
      questions.push({ type, text, choices, correctIndex, explanation: str(q.explanation, 600) });
    } else if (type === 'TRUE_FALSE') {
      if (typeof q.correct !== 'boolean' && !['true', 'false'].includes(String(q.correct).toLowerCase())) continue;
      const correct = q.correct === true || String(q.correct).toLowerCase() === 'true';
      questions.push({ type, text, choices: ['True', 'False'], correctIndex: correct ? 0 : 1, explanation: str(q.explanation, 600) });
    } else {
      questions.push({ type, text, modelAnswer: strLong(q.modelAnswer || q.answer, 2000), explanation: str(q.explanation, 600) });
    }
  }
  if (!questions.length) throw new Error('AI response contained no valid questions');
  return questions;
}

function validateSyllabusStructure(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('AI response: expected an object');
  const courseName = str(raw.courseName, 200);
  if (!courseName) throw new Error('AI response: missing courseName');
  const subjects = [];
  if (!Array.isArray(raw.subjects)) throw new Error('AI response: subjects must be an array');
  for (const s of raw.subjects.slice(0, 12)) {
    if (!s || typeof s !== 'object') continue;
    const subject = { name: str(s.name, 200), code: str(s.code, 40) || null, units: [] };
    if (!subject.name) continue;
    if (Array.isArray(s.units)) {
      for (const u of s.units.slice(0, 15)) {
        if (!u || typeof u !== 'object') continue;
        const unit = { name: str(u.name, 200), chapters: [] };
        if (!unit.name) continue;
        if (Array.isArray(u.chapters)) {
          for (const c of u.chapters.slice(0, 20)) {
            if (!c || typeof c !== 'object') continue;
            const chapter = { name: str(c.name, 200), topics: [] };
            if (!chapter.name) continue;
            if (Array.isArray(c.topics)) {
              for (const t of c.topics.slice(0, 25)) {
                const topicName = typeof t === 'string' ? str(t, 200) : str(t?.name, 200);
                if (topicName) chapter.topics.push({ name: topicName, important: bool(typeof t === 'object' ? t.important : false) });
              }
            }
            if (chapter.topics.length) unit.chapters.push(chapter);
          }
        }
        if (unit.chapters.length) subject.units.push(unit);
      }
    }
    subjects.push(subject);
  }
  if (!subjects.length) throw new Error('AI response: no subjects found');
  return { courseName, description: str(raw.description, 1000), subjects };
}

function validateNotes(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('AI response: expected notes object');
  const content = strLong(raw.content || raw.notes, 20000);
  if (!content) throw new Error('AI response: empty notes');
  return {
    title: str(raw.title, 200) || 'Notes',
    content,
    summary: str(raw.summary, 1200),
    keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints.map((k) => str(k, 300)).filter(Boolean).slice(0, 20) : [],
    importantTerms: Array.isArray(raw.importantTerms) ? raw.importantTerms.map((k) => str(k, 200)).filter(Boolean).slice(0, 30) : [],
  };
}

function validateStudyPlan(raw) {
  if (!Array.isArray(raw?.tasks)) throw new Error('AI response: tasks must be an array');
  const tasks = [];
  for (const t of raw.tasks.slice(0, 400)) {
    if (!t || typeof t !== 'object') continue;
    const title = str(t.title, 300);
    if (!title) continue;
    tasks.push({ title, detail: str(t.detail, 600), dayOffset: parseInt(t.dayOffset, 10) || 0 });
  }
  if (!tasks.length) throw new Error('AI response: no valid tasks');
  return { tasks, overview: str(raw.overview, 1000) };
}

function validateInterviewQuestion(raw) {
  const q = typeof raw === 'string' ? raw : str(raw?.question, 800);
  if (!q) throw new Error('AI response: empty interview question');
  return q;
}

function validateInterviewEvaluation(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('AI response: expected evaluation object');
  const clampScore = (v) => Math.max(0, Math.min(10, Number(v) || 0));
  return {
    technical: clampScore(raw.technical),
    communication: clampScore(raw.communication),
    relevance: clampScore(raw.relevance),
    clarity: clampScore(raw.clarity),
    feedback: strLong(raw.feedback, 2000),
  };
}

function validateInterviewSummary(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('AI response: expected summary object');
  const list = (v) => (Array.isArray(v) ? v.map((x) => str(x, 300)).filter(Boolean).slice(0, 10) : []);
  return {
    overallScore: Math.max(0, Math.min(100, Number(raw.overallScore) || 0)),
    strengths: list(raw.strengths),
    improvements: list(raw.improvements || raw.improvementAreas),
    suggestedTopics: list(raw.suggestedTopics),
    notes: strLong(raw.notes, 2000),
  };
}

module.exports = {
  validateQuizQuestions,
  validateSyllabusStructure,
  validateNotes,
  validateStudyPlan,
  validateInterviewQuestion,
  validateInterviewEvaluation,
  validateInterviewSummary,
};
