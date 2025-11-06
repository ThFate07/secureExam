import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT'),
  // Student-specific fields (optional)
  branch: z.string().optional(),
  division: z.string().optional(),
  year: z.string().optional(),
  rollNumber: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Question schemas
export const createQuestionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['MCQ', 'SHORT_ANSWER', 'ESSAY', 'TRUE_FALSE', 'MULTIPLE_SELECT']),
  question: z.string().min(1, 'Question text is required'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  points: z.number().min(0).default(1),
  tags: z.array(z.string()).default([]),
  subject: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateQuestionSchema = createQuestionSchema.partial();

// Exam schemas
export const createExamSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  maxAttempts: z.number().min(1).default(1),
  passingScore: z.number().min(0).max(100).optional(),
  questionIds: z.array(z.string()).min(1, 'At least one question is required'),
  settings: z.object({
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false),
    showResultsImmediately: z.boolean().default(false),
    allowReview: z.boolean().default(true),
    preventTabSwitching: z.boolean().default(true),
    requireWebcam: z.boolean().default(true),
    enableScreenMonitoring: z.boolean().default(true),
    lockdownBrowser: z.boolean().default(false),
    maxTabSwitchWarnings: z.number().min(1).max(10).default(3),
    enableFullscreenMode: z.boolean().default(false),
    disableDevTools: z.boolean().default(false),
  }),
});

// Ensure we don't allow both webcam requirement and forced fullscreen together
export const createExamSchemaWithChecks = createExamSchema.refine(
  (val) => !(val.settings.requireWebcam && val.settings.enableFullscreenMode),
  {
    message: 'Cannot enable both webcam requirement and fullscreen mode at the same time',
    path: ['settings'],
  }
);

export const updateExamSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  duration: z.number().min(1).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  maxAttempts: z.number().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'ARCHIVED']).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  settings: z.object({
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    showResultsImmediately: z.boolean().optional(),
    allowReview: z.boolean().optional(),
    preventTabSwitching: z.boolean().optional(),
    requireWebcam: z.boolean().optional(),
    enableScreenMonitoring: z.boolean().optional(),
    lockdownBrowser: z.boolean().optional(),
    maxTabSwitchWarnings: z.number().min(1).max(10).optional(),
    enableFullscreenMode: z.boolean().optional(),
    disableDevTools: z.boolean().optional(),
  }).optional(),
});

// For partial updates, validate that provided settings don't enable both options
export const updateExamSchemaWithChecks = updateExamSchema.superRefine((val, ctx) => {
  if (val.settings) {
    const s = val.settings as any;
    if (s.requireWebcam === true && s.enableFullscreenMode === true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot enable both webcam requirement and fullscreen mode at the same time',
      });
    }
  }
});

// Attempt schemas
export const startAttemptSchema = z.object({
  examId: z.string().cuid(),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().cuid(),
  answer: z.union([z.string(), z.number(), z.array(z.string())]),
  timeSpent: z.number().min(0).optional(),
  flaggedForReview: z.boolean().default(false),
});

export const submitExamSchema = z.object({
  attemptId: z.string().cuid(),
  answers: z.array(submitAnswerSchema),
});

// Monitoring schemas
export const monitoringEventSchema = z.object({
  examId: z.string().cuid(),
  attemptId: z.string().cuid().optional(),
  type: z.enum([
    'TAB_SWITCH',
    'WINDOW_BLUR',
    'COPY_PASTE',
    'RIGHT_CLICK',
    'FULLSCREEN_EXIT',
    'SUSPICIOUS_BEHAVIOR',
    'MULTIPLE_FACES',
    'NO_FACE_DETECTED',
    'FACE_CHANGED',
    'WEBCAM_DISABLED',
    'WEBCAM_ENABLED',
    'EXAM_STARTED',
    'EXAM_PAUSED',
    'EXAM_RESUMED',
    'EXAM_SUBMITTED',
    'UNAUTHORIZED_DEVICE',
    'NETWORK_ISSUE',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  description: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Enrollment schema
export const enrollStudentSchema = z.object({
  studentIds: z.array(z.string().cuid()).min(1, 'At least one student is required'),
});

// Grading schema
export const gradeSubmissionSchema = z.object({
  score: z.number().min(0),
  feedback: z.string().optional(),
  status: z.enum(['GRADED', 'NEEDS_REVIEW', 'FLAGGED']).default('GRADED'),
});
