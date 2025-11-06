import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireAuth } from '@/app/lib/api/auth';
import { submitExamSchema } from '@/app/lib/api/validation';
import { validateRequest } from '@/app/lib/api/errors';
import prisma from '@/app/lib/prisma';
import { computePlagiarismForAttempt } from '@/app/lib/plagiarism';
import { createAuditLog, AuditAction } from '@/app/lib/api/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/exams/:id/submissions - Submit exam answers
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const params = await context.params;
    const { id: examId } = params;
    const data = await validateRequest(request, submitExamSchema);

    if (user.role !== 'STUDENT') {
      throw new ApiError(403, 'Only students can submit exams');
    }

    // Get attempt
    const attempt = await prisma.attempt.findUnique({
      where: { id: data.attemptId },
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
      throw new ApiError(403, 'Not your attempt');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new ApiError(400, 'Attempt already submitted or abandoned');
    }

    if (attempt.examId !== examId) {
      throw new ApiError(400, 'Attempt does not belong to this exam');
    }

    // Check time limit
    const now = new Date();
    const timeElapsed = Math.floor((now.getTime() - attempt.startTime.getTime()) / 1000);
    const timeLimit = attempt.exam.duration * 60;

    if (timeElapsed > timeLimit + 60) { // 1 minute grace period
      throw new ApiError(400, 'Time limit exceeded');
    }

    // Save answers and auto-grade
    let totalScore = 0;
    let totalPoints = 0;

    for (const answerData of data.answers) {
      const examQuestion = attempt.exam.examQuestions.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (eq: any) => eq.questionId === answerData.questionId
      );

      if (!examQuestion) {
        continue;
      }

      const question = examQuestion.question;
      totalPoints += question.points;

      // Auto-grade MCQ and TRUE_FALSE
      let isCorrect = false;
      let pointsAwarded = 0;

      if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
        const correctAnswer = question.correctAnswer;
        isCorrect = String(answerData.answer) === String(correctAnswer);
        pointsAwarded = isCorrect ? question.points : 0;
        totalScore += pointsAwarded;
      }

      // Save answer
      await prisma.answer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: data.attemptId,
            questionId: answerData.questionId,
          },
        },
        create: {
          attemptId: data.attemptId,
          questionId: answerData.questionId,
          answer: answerData.answer as never,
          isCorrect: question.type === 'MCQ' || question.type === 'TRUE_FALSE' ? isCorrect : null,
          pointsAwarded: question.type === 'MCQ' || question.type === 'TRUE_FALSE' ? pointsAwarded : null,
          timeSpent: answerData.timeSpent || 0,
          flaggedForReview: answerData.flaggedForReview,
        },
        update: {
          answer: answerData.answer as never,
          isCorrect: question.type === 'MCQ' || question.type === 'TRUE_FALSE' ? isCorrect : null,
          pointsAwarded: question.type === 'MCQ' || question.type === 'TRUE_FALSE' ? pointsAwarded : null,
          timeSpent: answerData.timeSpent || 0,
          flaggedForReview: answerData.flaggedForReview,
        },
      });
    }

    // Update attempt
    const updatedAttempt = await prisma.attempt.update({
      where: { id: data.attemptId },
      data: {
        status: 'SUBMITTED',
        endTime: now,
        timeSpent: timeElapsed,
        score: totalScore,
      },
    });

    // Compute plagiarism for short/essay answers (if any)
    const shortQuestionIds = attempt.exam.examQuestions
      .map((eq) => eq.question)
      .filter((q) => q.type === 'SHORT_ANSWER' || q.type === 'ESSAY')
      .map((q) => q.id);

    let plagiarismPercent = 0;
    let plagiarismDetails = null;
    if (shortQuestionIds.length > 0) {
      try {
        const res = await computePlagiarismForAttempt(data.attemptId, attempt.examId, shortQuestionIds, user.id);
        plagiarismPercent = res.plagiarismPercent;
        plagiarismDetails = res.details;
      } catch (err) {
        console.error('Plagiarism check failed:', err);
      }
    }

    // Create submission (persist plagiarism info)
    const submission = await (prisma as any).submission.create({
      data: {
        attemptId: data.attemptId,
        studentId: user.id,
        score: totalScore,
        totalPoints,
        status: totalPoints === totalScore ? 'GRADED' : 'PENDING',
        plagiarismPercent: plagiarismPercent || null,
        plagiarismDetails: plagiarismDetails || null,
      },
    });

    // Create monitoring event
    await prisma.monitoringEvent.create({
      data: {
        examId,
        studentId: user.id,
        attemptId: attempt.id,
        type: 'EXAM_SUBMITTED',
        severity: 'LOW',
        description: 'Student submitted the exam',
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.EXAM_SUBMITTED,
      entity: 'Submission',
      entityId: submission.id,
      request,
    });

    return successResponse({
      message: 'Exam submitted successfully',
      submission,
      attempt: updatedAttempt,
      score: totalScore,
      totalPoints,
      percentage: totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0,
    });
  } catch (error) {
    return errorHandler(error);
  }
}

// GET /api/exams/:id/submissions - Get all submissions for an exam (teacher only)
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const params = await context.params;
    const { id: examId } = params;

    // Check if exam exists and user owns it
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    if (exam.createdById !== user.id && user.role !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to view submissions');
    }

    // Get submissions
    const submissions = await prisma.submission.findMany({
      where: {
        attempt: {
          examId,
        },
      },
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
          select: {
            id: true,
            startTime: true,
            endTime: true,
            timeSpent: true,
            status: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return successResponse({ submissions });
  } catch (error) {
    return errorHandler(error);
  }
}
