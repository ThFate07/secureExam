import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireStudent } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';
import { ExamStatus, AttemptStatus } from '@prisma/client';

type LowercaseExamStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';

interface SerializedQuestion {
  id: string;
  type: string;
  question: string;
  options?: string[];
  points: number;
  order: number;
}

interface SerializedExam {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  duration: number;
  startTime: string | null;
  endTime: string | null;
  maxAttempts: number;
  questions: SerializedQuestion[];
  settings: unknown;
  status: LowercaseExamStatus;
  createdAt: string;
}

interface ShufflingMetadata {
  shuffledQuestionIds?: string[];
  optionsPermutation?: Record<string, number[] | undefined>;
}

type ExamSettingsType = ShufflingMetadata & {
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
};

const lowerExamStatus = (status: ExamStatus): LowercaseExamStatus =>
  status.toLowerCase() as LowercaseExamStatus;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireStudent(request);
    const { id } = params;

    // Check if student is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        examId_studentId: {
          examId: id,
          studentId: user.id,
        },
      },
    });

    if (!enrollment) {
      throw new ApiError(403, 'You are not enrolled in this exam');
    }

    // Get exam with questions
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    // Check if exam is available
    const now = new Date();
    if (exam.status !== ExamStatus.PUBLISHED && exam.status !== ExamStatus.ONGOING) {
      throw new ApiError(403, 'Exam is not available');
    }

    if (exam.startTime && exam.startTime > now) {
      throw new ApiError(403, 'Exam has not started yet');
    }

    if (exam.endTime && exam.endTime < now) {
      throw new ApiError(403, 'Exam has ended');
    }

    // Check attempts (including terminated ones in the count)
    const attempts = await prisma.attempt.count({
      where: {
        examId: id,
        studentId: user.id,
        status: {
          in: [AttemptStatus.SUBMITTED, AttemptStatus.TERMINATED]
        },
      },
    });

    if (attempts >= exam.maxAttempts) {
      throw new ApiError(403, 'You have reached the maximum number of attempts');
    }

    // Check for existing in-progress attempt
    const inProgressAttempt = await prisma.attempt.findFirst({
      where: {
        examId: id,
        studentId: user.id,
        status: AttemptStatus.IN_PROGRESS,
      },
    });

    // Check for terminated attempt
    const terminatedAttempt = await prisma.attempt.findFirst({
      where: {
        examId: id,
        studentId: user.id,
        status: AttemptStatus.TERMINATED,
      },
      include: {
        monitoringEvents: {
          where: {
            type: 'EXAM_SUBMITTED',
            description: {
              contains: 'terminated by teacher'
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      }
    });

    if (terminatedAttempt) {
      // Return the exam data but mark it as terminated
      const serializedExam: SerializedExam = {
        id: exam.id,
        title: exam.title,
        description: exam.description ?? '',
        teacherId: exam.createdById,
        duration: exam.duration,
        startTime: exam.startTime?.toISOString() ?? null,
        endTime: exam.endTime?.toISOString() ?? null,
        maxAttempts: exam.maxAttempts,
        questions: [], // Don't return questions for terminated exam
        settings: exam.settings,
        status: lowerExamStatus(exam.status),
        createdAt: exam.createdAt.toISOString(),
      };

      const terminationEvent = terminatedAttempt.monitoringEvents[0];
      const terminationReason = terminationEvent?.description || 'Exam was terminated by the teacher';

      return successResponse({
        exam: serializedExam,
        attemptId: terminatedAttempt.id,
        attempt: {
          status: 'TERMINATED',
        },
        terminationReason,
      });
    }

    if (inProgressAttempt) {
      // Return existing attempt — preserve previously generated shuffling metadata if any
      const attemptWithMeta = await prisma.attempt.findUnique({
        where: { id: inProgressAttempt.id },
      });

  const metadata = (attemptWithMeta?.metadata ?? {}) as ShufflingMetadata;

      // Build base question list (preserve DB order)
      const baseQuestions = exam.examQuestions.map((eq) => ({
        id: eq.question.id,
        type: eq.question.type.toLowerCase().replace(/_/g, '-'),
        question: eq.question.question,
        options: eq.question.options ? (eq.question.options as string[]) : undefined,
        points: eq.question.points,
        order: eq.order,
      } as SerializedQuestion));

      const shuffledQuestionIds = Array.isArray(metadata.shuffledQuestionIds)
        ? (metadata.shuffledQuestionIds as string[])
        : baseQuestions.map((q) => q.id);

      const optionsPermutation = (metadata.optionsPermutation ?? {}) as Record<string, number[] | undefined>;

      const questionsForClient: SerializedQuestion[] = [];

      for (const qid of shuffledQuestionIds) {
        const q = baseQuestions.find((b) => b.id === qid)!;
        if (!q) continue;

        const perm = optionsPermutation[q.id];
        if (Array.isArray(perm) && Array.isArray(q.options)) {
          // reconstruct shuffled options from permutation (perm[newIndex] = originalIndex)
          const original = q.options.slice();
          const shuffled = perm.map((origIdx) => original[origIdx]);
          questionsForClient.push({ ...q, options: shuffled });
        } else {
          questionsForClient.push(q);
        }
      }

      const serializedExam: SerializedExam = {
        id: exam.id,
        title: exam.title,
        description: exam.description ?? '',
        teacherId: exam.createdById,
        duration: exam.duration,
        startTime: exam.startTime?.toISOString() ?? null,
        endTime: exam.endTime?.toISOString() ?? null,
        maxAttempts: exam.maxAttempts,
        questions: questionsForClient,
        settings: exam.settings,
        status: lowerExamStatus(exam.status),
        createdAt: exam.createdAt.toISOString(),
      };

      return successResponse({
        exam: serializedExam,
        attemptId: inProgressAttempt.id,
      });
    }

    // Create new attempt — build shuffling metadata if enabled
    // Parse settings (stored as JSON in DB)
  const settings = (exam.settings ?? {}) as ExamSettingsType;
  const shouldShuffleQuestions = Boolean(settings.shuffleQuestions);
  const shouldShuffleOptions = Boolean(settings.shuffleOptions);

    // Helper: Fisher-Yates shuffle returning new array and permutation
    const shuffleArray = <T,>(arr: T[]) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    // Build base question list (preserve DB order)
    const baseQuestions = exam.examQuestions.map((eq) => ({
      id: eq.question.id,
      type: eq.question.type.toLowerCase().replace(/_/g, '-'),
      question: eq.question.question,
      options: eq.question.options ? (eq.question.options as string[]) : undefined,
      points: eq.question.points,
      order: eq.order,
    } as SerializedQuestion));

    // Compute shuffled question order (array of question ids)
    const shuffledQuestionIds = shouldShuffleQuestions ? shuffleArray(baseQuestions.map((q) => q.id)) : baseQuestions.map((q) => q.id);

    // Compute options permutations: map questionId -> permutation array (newIndex -> originalIndex)
    const optionsPermutation: Record<string, number[] | undefined> = {};

    const questionsForClient: SerializedQuestion[] = [];

    // For each question id in shuffled order, prepare question object (with possibly shuffled options)
    for (const qid of shuffledQuestionIds) {
      const q = baseQuestions.find((b) => b.id === qid)!;
      if (!q) continue;

      if (shouldShuffleOptions && Array.isArray(q.options) && q.options.length > 1) {
        const originalOptions = q.options.slice();
        const shuffled = shuffleArray(originalOptions);
        // Build permutation mapping newIndex -> originalIndex
        const perm: number[] = shuffled.map((opt) => originalOptions.indexOf(opt));
        optionsPermutation[q.id] = perm;
        questionsForClient.push({ ...q, options: shuffled });
      } else {
        // no shuffling
        optionsPermutation[q.id] = undefined;
        questionsForClient.push(q);
      }
    }

    // Create attempt with metadata containing shuffling information
    const newAttempt = await prisma.attempt.create({
      data: {
        examId: id,
        studentId: user.id,
        startTime: new Date(),
        status: AttemptStatus.IN_PROGRESS,
        metadata: {
          shuffledQuestionIds,
          optionsPermutation,
        },
      },
    });

    const serializedExam: SerializedExam = {
      id: exam.id,
      title: exam.title,
      description: exam.description ?? '',
      teacherId: exam.createdById,
      duration: exam.duration,
      startTime: exam.startTime?.toISOString() ?? null,
      endTime: exam.endTime?.toISOString() ?? null,
      maxAttempts: exam.maxAttempts,
      questions: questionsForClient,
      settings: exam.settings,
      status: lowerExamStatus(exam.status),
      createdAt: exam.createdAt.toISOString(),
    };

    return successResponse({
      exam: serializedExam,
      attemptId: newAttempt.id,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
