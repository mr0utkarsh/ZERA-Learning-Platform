import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name must be 120 characters or fewer'),
  email: z.string().trim().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be 128 characters or fewer')
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be 128 characters or fewer')
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address')
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the six-digit verification code')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be 128 characters or fewer')
});

export const idSchema = z.object({
  id: z.string().min(1)
});

export const onboardingProfileSchema = z.object({
  institution: z.string().trim().max(160).optional().or(z.literal('')),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  learningGoal: z.string().trim().min(5, 'Tell us a little about your learning goal').max(500),
  studyLevel: z.string().trim().min(2, 'Choose your current study level').max(80),
  weeklyHours: z.coerce.number().int().min(1, 'Choose at least one hour per week').max(80)
});

// Only used for the legacy JSON path; the multipart route validates the real
// file in the controller instead.
export const syllabusUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(120).optional(),
  extractedText: z.string().trim().min(1, 'The selected syllabus file is empty').max(100000)
});

const topicSchema = z.object({
  title: z.string().trim().min(1, 'A topic title is required').max(200),
  description: z.string().trim().max(2000).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  uncertain: z.boolean().optional(),
  needsRevision: z.boolean().optional()
});

const unitSchema = z.object({
  title: z.string().trim().min(1, 'A unit title is required').max(160),
  topics: z.array(topicSchema).min(1, 'A unit needs at least one topic')
});

const subjectSchema = z.object({
  title: z.string().trim().min(1, 'A subject title is required').max(160),
  units: z.array(unitSchema).min(1, 'A subject needs at least one unit')
});

/** Body for POST /api/syllabus/confirm — the student-reviewed structure. */
export const confirmSyllabusSchema = z.object({
  uploadId: z.string().trim().min(1).optional(),
  courseName: z.string().trim().min(1, 'A course name is required').max(160),
  semester: z.string().trim().max(40).optional(),
  institution: z.string().trim().max(160).optional(),
  examType: z.string().trim().max(80).optional(),
  examDate: z.string().datetime({ offset: true }).optional(),
  subjects: z.array(subjectSchema).min(1, 'Add at least one subject')
});

/** Body for PATCH /api/progress/topics/:id — a manual status update. */
export const topicStatusSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVISION'])
});

/** Body for POST /api/quiz — create a validated, user-owned quiz. */
export const quizCreateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  topicId: z.string().trim().min(1).optional(),
  source: z.enum(['AI', 'MANUAL']).optional(),
  questions: z.array(z.object({
    prompt: z.string().trim().min(1, 'A question prompt is required').max(1000),
    options: z.array(z.string().trim().min(1)).min(2, 'Each question needs at least two options'),
    correctAnswer: z.string().trim().min(1, 'A correct answer is required'),
    explanation: z.string().trim().max(2000).optional()
  })).min(1, 'A quiz needs at least one question').max(50)
});

/** Body for POST /api/quiz/:id/attempts — submit answers for scoring. */
export const quizSubmitSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().trim().min(1),
    answer: z.string().trim().max(500)
  })).max(50)
});

/** Body for POST /api/resources (admin) — create a curated resource. */
export const resourceCreateSchema = z.object({
  title: z.string().trim().min(1, 'A title is required').max(200),
  url: z.string().trim().url('A valid URL is required').max(1000),
  skill: z.string().trim().min(1, 'A skill is required').max(80),
  technology: z.string().trim().min(1, 'A technology is required').max(80),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  projectType: z.string().trim().max(80).optional(),
  source: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional()
});

/** Body for PUT /api/onboarding/academic — all fields optional (skip-friendly). */
export const academicProfileSchema = z.object({
  displayName: z.string().trim().max(120).optional(),
  country: z.string().trim().max(80).optional(),
  language: z.string().trim().max(40).optional(),
  educationLevel: z.enum(['school', 'diploma', 'undergraduate', 'postgraduate', 'competitive']).optional(),
  courseProgram: z.string().trim().max(160).optional(),
  semester: z.string().trim().max(40).optional(),
  branch: z.string().trim().max(120).optional(),
  institution: z.string().trim().max(160).optional(),
  examType: z.string().trim().max(80).optional(),
  examDate: z.string().datetime({ offset: true }).optional(),
  dailyMinutes: z.coerce.number().int().min(0).max(1440).optional(),
  weeklyHours: z.coerce.number().int().min(0).max(168).optional(),
  studyDays: z.array(z.string().trim().max(12)).max(7).optional(),
  studyTimePref: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
  difficultAreas: z.array(z.string().trim().max(120)).max(60).optional(),
  explanationStyle: z.enum(['simple', 'detailed', 'example-first', 'exam-focused']).optional(),
  preferredLanguage: z.string().trim().max(40).optional(),
  subjects: z.array(z.string().trim().max(120)).max(60).optional()
}).partial();

/** Body for POST /api/study-plans — generate a plan from a confirmed syllabus. */
export const studyPlanGenerateSchema = z.object({
  syllabusId: z.string().trim().min(1, 'A confirmed syllabus id is required'),
  title: z.string().trim().max(200).optional(),
  examDate: z.string().datetime({ offset: true }).optional(),
  useAi: z.boolean().optional()
});

/** Body for PATCH /api/study-plans/tasks/:taskId/reschedule. */
export const taskRescheduleSchema = z.object({
  dueDate: z.string().datetime({ offset: true }).nullable().optional()
});

/** Body for POST /api/doubts — ask a doubt. */
export const doubtAskSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
  topicId: z.string().trim().min(1).optional(),
  question: z.string().trim().min(1, 'A question is required').max(4000),
  style: z.string().trim().max(40).optional(),
  language: z.string().trim().max(40).optional()
});

/** Body for POST /api/interviews — start a mock interview. */
export const interviewStartSchema = z.object({
  role: z.string().trim().min(1, 'A target role is required').max(120),
  skills: z.array(z.string().trim().max(60)).max(20).optional(),
  interviewType: z.enum(['technical', 'hr', 'behavioral', 'mixed']).optional(),
  count: z.coerce.number().int().min(1).max(10).optional()
});

/** Body for POST /api/interviews/:id/evaluate — submit answers. */
export const interviewEvaluateSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().trim().min(1),
    answer: z.string().trim().max(8000)
  })).max(20)
});

export const validateProfileSetup = (body) => {
  const result = onboardingProfileSchema.safeParse(body ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const error = new Error(issue?.message || 'Invalid profile payload');
    error.statusCode = 400;
    throw error;
  }
  return result.data;
};

export const otpSendSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address')
});

export const otpVerifySchema = z.object({
  email: z.string().trim().email('Please provide a valid email address'),
  otp: z.string().trim().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be 6 numeric digits'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be 128 characters or fewer')
});


export const validateRequest = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});

  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue?.message || 'Invalid request payload';
    return res.status(400).json({
      success: false,
      message
    });
  }

  req.body = result.data;
  next();
};
