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
