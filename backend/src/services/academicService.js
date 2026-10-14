import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const str = (v, max) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

const strArray = (v, max = 40, itemMax = 120) => {
  if (!Array.isArray(v)) return undefined;
  return v.map((x) => String(x ?? '').trim().slice(0, itemMax)).filter(Boolean).slice(0, max);
};

const EDUCATION_LEVELS = new Set(['school', 'diploma', 'undergraduate', 'postgraduate', 'competitive']);
const STUDY_TIMES = new Set(['morning', 'afternoon', 'evening', 'night']);
const EXPLANATION_STYLES = new Set(['simple', 'detailed', 'example-first', 'exam-focused']);

/**
 * Saves the student's academic onboarding profile (Step 2). Every field is
 * optional so a student can skip and complete details later; conditional
 * relevance (which questions apply) is decided by the client from
 * educationLevel, while the server simply stores what is provided. Unknown
 * enum-ish values are normalized to null rather than guessed.
 */
export const saveAcademicProfile = async (userId, input) => {
  const examDate = input.examDate ? new Date(input.examDate) : null;
  if (input.examDate && Number.isNaN(examDate?.getTime())) {
    throw new ApiError(400, 'The exam date is not a valid date.');
  }

  const data = {};
  const set = (key, value) => { if (value !== undefined) data[key] = value; };

  set('displayName', input.displayName !== undefined ? str(input.displayName, 120) : undefined);
  set('country', input.country !== undefined ? str(input.country, 80) : undefined);
  set('language', input.language !== undefined ? str(input.language, 40) : undefined);
  set('educationLevel', EDUCATION_LEVELS.has(String(input.educationLevel || '').toLowerCase()) ? String(input.educationLevel).toLowerCase() : (input.educationLevel === undefined ? undefined : null));
  set('courseProgram', input.courseProgram !== undefined ? str(input.courseProgram, 160) : undefined);
  set('semester', input.semester !== undefined ? str(input.semester, 40) : undefined);
  set('branch', input.branch !== undefined ? str(input.branch, 120) : undefined);
  set('institution', input.institution !== undefined ? str(input.institution, 160) : undefined);
  set('examType', input.examType !== undefined ? str(input.examType, 80) : undefined);
  set('examDate', input.examDate !== undefined ? examDate : undefined);
  set('studyTimePref', STUDY_TIMES.has(String(input.studyTimePref || '').toLowerCase()) ? String(input.studyTimePref).toLowerCase() : (input.studyTimePref === undefined ? undefined : null));
  set('explanationStyle', EXPLANATION_STYLES.has(String(input.explanationStyle || '').toLowerCase()) ? String(input.explanationStyle).toLowerCase() : (input.explanationStyle === undefined ? undefined : null));
  set('preferredLanguage', input.preferredLanguage !== undefined ? str(input.preferredLanguage, 40) : undefined);

  if (input.subjects !== undefined) set('subjects', strArray(input.subjects));
  if (input.studyDays !== undefined) set('studyDays', strArray(input.studyDays, 7, 12));
  if (input.difficultAreas !== undefined) set('difficultAreas', strArray(input.difficultAreas));

  if (input.dailyMinutes !== undefined) {
    const n = Number(input.dailyMinutes);
    if (!Number.isFinite(n) || n < 0 || n > 24 * 60) throw new ApiError(400, 'Daily study minutes must be between 0 and 1440.');
    set('dailyMinutes', Math.round(n));
  }
  if (input.weeklyHours !== undefined) {
    const n = Number(input.weeklyHours);
    if (!Number.isFinite(n) || n < 0 || n > 168) throw new ApiError(400, 'Weekly hours must be between 0 and 168.');
    set('weeklyHours', Math.round(n));
  }

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data }
  });
  return profile;
};

export const getAcademicProfile = async (userId) =>
  prisma.profile.findUnique({ where: { userId } });
