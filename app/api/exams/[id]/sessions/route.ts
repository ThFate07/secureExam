import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireAuth } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';
import { createAuditLog, AuditAction } from '@/app/lib/api/audit';
import { getClientIp, getUserAgent } from '@/app/lib/api/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/exams/:id/sessions - Start an exam attempt
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const { id: examId } = await context.params;

    if (user.role !== 'STUDENT') {
      throw new ApiError(403, 'Only students can start exam attempts');
    }

    // Get exam details
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
        enrollments: {
          where: { studentId: user.id },
        },
      },
    });

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    // Check enrollment
    if (exam.enrollments.length === 0) {
      throw new ApiError(403, 'You are not enrolled in this exam');
    }

    // Check exam status
    if (exam.status !== 'PUBLISHED' && exam.status !== 'ONGOING') {
      throw new ApiError(400, 'Exam is not available');
    }

    // Check time window
    const now = new Date();
    if (exam.startTime && now < exam.startTime) {
      throw new ApiError(400, 'Exam has not started yet');
    }
    if (exam.endTime && now > exam.endTime) {
      throw new ApiError(400, 'Exam has ended');
    }

    // Check attempts limit
    const attemptCount = await prisma.attempt.count({
      where: {
        examId,
        studentId: user.id,
        status: { in: ['SUBMITTED', 'IN_PROGRESS'] },
      },
    });

    if (attemptCount >= exam.maxAttempts) {
      throw new ApiError(400, `Maximum attempts (${exam.maxAttempts}) reached`);
    }

    // Check for active attempt
    const activeAttempt = await prisma.attempt.findFirst({
      where: {
        examId,
        studentId: user.id,
        status: 'IN_PROGRESS',
      },
    });

    if (activeAttempt) {
      // Return existing attempt
      const timeElapsed = Math.floor((now.getTime() - activeAttempt.startTime.getTime()) / 1000);
      const timeRemaining = Math.max(0, exam.duration * 60 - timeElapsed);

      // Remove correct answers for students
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      const questionsForStudent = exam.examQuestions.map((eq: any) => {
        const { correctAnswer: _, ...questionWithoutAnswer } = eq.question;
        return {
          ...eq,
          question: questionWithoutAnswer,
        };
      });

      return successResponse({
        attempt: activeAttempt,
        exam: {
          ...exam,
          examQuestions: questionsForStudent,
        },
        timeRemaining,
        timeElapsed,
      });
    }

    // Shuffle questions if needed
    const settings = exam.settings as { shuffleQuestions?: boolean };
    let questions = exam.examQuestions;
    if (settings.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    // Create new attempt
    const attempt = await prisma.attempt.create({
      data: {
        examId,
        studentId: user.id,
        status: 'IN_PROGRESS',
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
        metadata: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          questionOrder: questions.map((q: any) => q.questionId),
        } as never,
      },
    });

    // Create monitoring event
    await prisma.monitoringEvent.create({
      data: {
        examId,
        studentId: user.id,
        attemptId: attempt.id,
        type: 'EXAM_STARTED',
        severity: 'LOW',
        description: 'Student started the exam',
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.EXAM_STARTED,
      entity: 'Attempt',
      entityId: attempt.id,
      request,
    });

    // Remove correct answers for students
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questionsForStudent = questions.map((eq: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { correctAnswer, ...questionWithoutAnswer } = eq.question;
      return {
        ...eq,
        question: questionWithoutAnswer,
      };
    });

    return successResponse({
      attempt,
      exam: {
        ...exam,
        examQuestions: questionsForStudent,
      },
      timeRemaining: exam.duration * 60,
      timeElapsed: 0,
    }, 201);
  } catch (error) {
    return errorHandler(error);
  }
}
