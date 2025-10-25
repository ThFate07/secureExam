import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireStudent } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';
import { AttemptStatus } from '@prisma/client';

interface AnswerSubmission {
  questionId: string;
  answer: string | number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireStudent(request);
    const { id: attemptId } = params;
    const body = await request.json();
    const { answers } = body as { answers: AnswerSubmission[] };

    // Get the attempt
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: {
                question: true,
              },
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

    // Calculate score
    let totalScore = 0;
    let totalPoints = 0;
    const answersMap = new Map(answers.map((a) => [a.questionId, a.answer]));

    const gradedAnswers = attempt.exam.examQuestions.map((eq) => {
      const question = eq.question;
      totalPoints += question.points;
      const studentAnswer = answersMap.get(question.id);

      let isCorrect = false;
      let earnedPoints = 0;

      if (question.type === 'MCQ' && typeof studentAnswer === 'number') {
        const correctAnswer = question.correctAnswer;
        isCorrect = studentAnswer === (typeof correctAnswer === 'string' ? parseInt(correctAnswer) : correctAnswer);
        earnedPoints = isCorrect ? question.points : 0;
      } else if (question.type === 'SHORT_ANSWER') {
        // For short answer, mark as needing manual grading
        earnedPoints = 0; // Will be graded manually
      }

      totalScore += earnedPoints;

      return {
        questionId: question.id,
        answer: studentAnswer,
        isCorrect,
        earnedPoints,
      };
    });

    // Update attempt
    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        endTime: new Date(),
        score: totalScore,
        status: AttemptStatus.SUBMITTED,
      },
    });

    // Create submission
    await prisma.submission.create({
      data: {
        attemptId,
        studentId: user.id,
        score: totalScore,
        totalPoints,
        gradedAt: new Date(),
        status: 'GRADED',
      },
    });

    return successResponse({
      score: totalScore,
      totalPoints,
      percentage: totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0,
      gradedAnswers,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
