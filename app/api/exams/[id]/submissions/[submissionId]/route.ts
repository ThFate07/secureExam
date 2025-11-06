import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireAuth } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string; submissionId: string }>;
}

// GET /api/exams/:id/submissions/:submissionId - Get a single submission with answers (teacher only)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id: examId, submissionId } = await context.params;

    // Check exam exists and permission
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new ApiError(404, 'Exam not found');
    if (exam.createdById !== user.id && user.role !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to view this submission');
    }

    // Fetch submission and include the attempt with its answers and question details
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
        attempt: {
          select: {
            id: true,
            examId: true,
            studentId: true,
            startTime: true,
            endTime: true,
            status: true,
            timeSpent: true,
            // Include answers and their question details so UI always receives them
            answers: {
              include: {
                question: {
                  select: { id: true, title: true, question: true, type: true, points: true, correctAnswer: true },
                },
              },
              orderBy: { questionId: 'asc' },
            },
          },
        },
      },
    });

    if (!submission) throw new ApiError(404, 'Submission not found');

    // Ensure submission belongs to requested exam
    if (!submission.attempt || submission.attempt.examId !== examId) {
      throw new ApiError(400, 'Submission does not belong to this exam');
    }

    return successResponse({ submission });
  } catch (error) {
    return errorHandler(error);
  }
}
