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

    // Check attempts
    const attempts = await prisma.attempt.count({
      where: {
        examId: id,
        studentId: user.id,
        status: AttemptStatus.SUBMITTED,
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

    if (inProgressAttempt) {
      // Return existing attempt
      const serializedExam: SerializedExam = {
        id: exam.id,
        title: exam.title,
  description: exam.description ?? '',
        teacherId: exam.createdById,
        duration: exam.duration,
        startTime: exam.startTime?.toISOString() ?? null,
        endTime: exam.endTime?.toISOString() ?? null,
        maxAttempts: exam.maxAttempts,
        questions: exam.examQuestions.map((eq) => ({
          id: eq.question.id,
          type: eq.question.type.toLowerCase(),
          question: eq.question.question,
          options: eq.question.options ? (eq.question.options as string[]) : undefined,
          points: eq.question.points,
          order: eq.order,
        })),
        settings: exam.settings,
        status: lowerExamStatus(exam.status),
        createdAt: exam.createdAt.toISOString(),
      };

      return successResponse({
        exam: serializedExam,
        attemptId: inProgressAttempt.id,
      });
    }

    // Create new attempt
    const newAttempt = await prisma.attempt.create({
      data: {
        examId: id,
        studentId: user.id,
        startTime: new Date(),
        status: AttemptStatus.IN_PROGRESS,
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
      questions: exam.examQuestions.map((eq) => ({
        id: eq.question.id,
        type: eq.question.type.toLowerCase(),
        question: eq.question.question,
        options: eq.question.options ? (eq.question.options as string[]) : undefined,
        points: eq.question.points,
        order: eq.order,
      })),
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
