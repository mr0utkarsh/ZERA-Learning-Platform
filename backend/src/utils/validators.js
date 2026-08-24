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

export const updateStudentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED'])
});

export const onboardingProfileSchema = z.object({
  institution: z.string().trim().max(160).optional().or(z.literal('')),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  learningGoal: z.string().trim().min(5, 'Tell us a little about your learning goal').max(500),
  studyLevel: z.string().trim().min(2, 'Choose your current study level').max(80),
  weeklyHours: z.coerce.number().int().min(1, 'Choose at least one hour per week').max(80)
});

export const syllabusUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(120).optional(),
  extractedText: z.string().trim().min(1, 'The selected syllabus file is empty').max(100000)
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
