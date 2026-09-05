/**
 * Canonical enum values. With PostgreSQL these mirror the Prisma enums;
 * with the SQLite dev schema the same values are enforced here.
 */
const Role = { STUDENT: 'STUDENT', ADMIN: 'ADMIN', SUPER_ADMIN: 'SUPER_ADMIN' };
const AccountStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  // Admin-invitation lifecycle (admin accounts only):
  INVITED: 'INVITED',   // invitation created, not yet accepted
  PENDING: 'PENDING',   // invitee set a password, awaiting SUPER_ADMIN approval
};
const OtpPurpose = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
  ADMIN_INVITE: 'ADMIN_INVITE',
};
const QuizType = { QUIZ: 'QUIZ', MOCK_TEST: 'MOCK_TEST' };
const QuestionType = { MCQ: 'MCQ', TRUE_FALSE: 'TRUE_FALSE', SHORT_ANSWER: 'SHORT_ANSWER' };
const AttemptStatus = { IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED' };
const NoteStyle = { STANDARD: 'STANDARD', HANDWRITTEN: 'HANDWRITTEN' };
const InterviewStatus = { IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED' };
const StudyPlanStatus = { ACTIVE: 'ACTIVE', COMPLETED: 'COMPLETED', ABANDONED: 'ABANDONED' };
const ActivityType = {
  LESSON_COMPLETED: 'LESSON_COMPLETED',
  QUIZ_ATTEMPTED: 'QUIZ_ATTEMPTED',
  TEST_ATTEMPTED: 'TEST_ATTEMPTED',
  NOTE_GENERATED: 'NOTE_GENERATED',
  PYQ_ATTEMPTED: 'PYQ_ATTEMPTED',
  INTERVIEW_COMPLETED: 'INTERVIEW_COMPLETED',
  STUDY_PLAN_CREATED: 'STUDY_PLAN_CREATED',
  SYLLABUS_ANALYZED: 'SYLLABUS_ANALYZED',
};
const NoteTargetType = {
  SUBJECT: 'SUBJECT', UNIT: 'UNIT', CHAPTER: 'CHAPTER', TOPIC: 'TOPIC', LESSON: 'LESSON',
};

module.exports = {
  Role, AccountStatus, OtpPurpose, QuizType, QuestionType, AttemptStatus,
  NoteStyle, InterviewStatus, StudyPlanStatus, ActivityType, NoteTargetType,
};
