import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireStudent } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';
import { AttemptStatus } from '@prisma/client';

interface AnswerData {
  questionId: string;
  answer: string | number;
  timeSpent?: number;
  flaggedForReview?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireStudent(request);
    const { id: attemptId } = params;
    const body = await request.json();
    const { questionId, answer, timeSpent, flaggedForReview } = body as AnswerData;

    if (!questionId || answer === undefined) {
      throw new ApiError(400, 'questionId and answer are required');
    }

    // Get the attempt
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            examQuestions: {
              where: { questionId },
              include: { question: true },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    if (attempt.studentId !== user.id) {
      throw new ApiError(403, 'Unauthorized');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ApiError(400, 'Attempt is not in progress');
    }

    // Verify the question belongs to this exam
    const examQuestion = attempt.exam.examQuestions.find(eq => eq.questionId === questionId);
    if (!examQuestion) {
      throw new ApiError(400, 'Question does not belong to this exam');
    }

    // Auto-grade MCQ if applicable (for immediate feedback, but don't store final score yet)
    let isCorrect: boolean | null = null;
    let pointsAwarded: number | null = null;
    const question = examQuestion.question;

    if (question.type === 'MCQ' && typeof answer === 'number') {
      const correctAnswer = question.correctAnswer;
      isCorrect = answer === (typeof correctAnswer === 'string' ? parseInt(correctAnswer) : correctAnswer);
      // Don't award points yet - only on final submission
      pointsAwarded = null;
    }

    // Save or update the answer
    const savedAnswer = await prisma.answer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      create: {
        attemptId,
        questionId,
        answer: answer as any,
        isCorrect,
        pointsAwarded,
        timeSpent: timeSpent || 0,
        flaggedForReview: flaggedForReview || false,
      },
      update: {
        answer: answer as any,
        isCorrect,
        timeSpent: timeSpent || 0,
        flaggedForReview: flaggedForReview || false,
      },
    });

    return successResponse({
      answer: savedAnswer,
      message: 'Answer saved successfully',
    });
  } catch (error) {
    return errorHandler(error);
  }
}

// GET endpoint to retrieve all saved answers for an attempt
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireStudent(request);
    const { id: attemptId } = params;

    // Get the attempt
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    if (attempt.studentId !== user.id) {
      throw new ApiError(403, 'Unauthorized');
    }

    // Get all saved answers for this attempt
    const answers = await prisma.answer.findMany({
      where: { attemptId },
      select: {
        questionId: true,
        answer: true,
        flaggedForReview: true,
        timeSpent: true,
      },
    });

    // Convert to map format for easy lookup
    const answersMap: Record<string, { answer: string | number; flaggedForReview: boolean; timeSpent: number }> = {};
    for (const a of answers) {
      answersMap[a.questionId] = {
        answer: a.answer as string | number,
        flaggedForReview: a.flaggedForReview,
        timeSpent: a.timeSpent || 0,
      };
    }

    return successResponse({
      answers: answersMap,
    });
  } catch (error) {
    return errorHandler(error);
  }
}

