import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireAuth } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/submissions/:id - Get detailed submission with answers (teacher only)
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const params = await context.params;
    const { id: submissionId } = params;

    // Get submission with all details
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        attempt: {
          include: {
            exam: {
              include: {
                examQuestions: {
                  include: {
                    question: true,
                  },
                  orderBy: { order: 'asc' },
                },
              },
            },
            answers: {
              include: {
                question: true,
              },
              orderBy: {
                question: {
                  id: 'asc',
                },
              },
            },
          },
        },
        gradedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }

    // Check permissions - teacher must own the exam
    const exam = submission.attempt.exam;
    if (exam.createdById !== user.id && user.role !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to view this submission');
    }

    return successResponse({ submission });
  } catch (error) {
    return errorHandler(error);
  }
}

// PATCH /api/submissions/:id - Grade a submission (teacher only)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const params = await context.params;
    const { id: submissionId } = params;
    const body = await request.json();
    
    const { grades, feedback, totalScore } = body as {
      grades?: Array<{ questionId: string; pointsAwarded: number }>;
      feedback?: string;
      totalScore?: number;
    };

    // Get submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        attempt: {
          include: {
            exam: true,
            answers: true,
          },
        },
      },
    });

    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }

    // Check permissions
    if (submission.attempt.exam.createdById !== user.id && user.role !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to grade this submission');
    }

    // Update individual answer grades if provided
    if (grades && Array.isArray(grades)) {
      for (const grade of grades) {
        await prisma.answer.updateMany({
          where: {
            attemptId: submission.attemptId,
            questionId: grade.questionId,
          },
          data: {
            pointsAwarded: grade.pointsAwarded,
            isCorrect: grade.pointsAwarded > 0 ? true : false,
          },
        });
      }

      // Recalculate total score from all answers
      const answers = await prisma.answer.findMany({
        where: { attemptId: submission.attemptId },
      });

      const calculatedTotalScore = answers.reduce(
        (sum, answer) => sum + (answer.pointsAwarded || 0),
        0
      );

      // Update submission with calculated score
      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          score: calculatedTotalScore,
          gradedAt: new Date(),
          gradedById: user.id,
          feedback: feedback || submission.feedback,
          status: 'GRADED',
        },
      });

      // Also update attempt score
      await prisma.attempt.update({
        where: { id: submission.attemptId },
        data: {
          score: calculatedTotalScore,
        },
      });

      return successResponse({ submission: updatedSubmission });
    }

    // If totalScore is provided directly (alternative grading method)
    if (totalScore !== undefined) {
      const totalPoints = submission.totalPoints || 0;
      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          score: totalScore,
          gradedAt: new Date(),
          gradedById: user.id,
          feedback: feedback || submission.feedback,
          status: 'GRADED',
        },
      });

      await prisma.attempt.update({
        where: { id: submission.attemptId },
        data: { score: totalScore },
      });

      return successResponse({ submission: updatedSubmission });
    }

    // If only feedback is provided
    if (feedback !== undefined) {
      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          feedback,
          gradedById: user.id,
          gradedAt: submission.gradedAt || new Date(),
        },
      });

      return successResponse({ submission: updatedSubmission });
    }

    throw new ApiError(400, 'No grading data provided');
  } catch (error) {
    return errorHandler(error);
  }
}

