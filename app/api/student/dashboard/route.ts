import { NextRequest } from 'next/server';
import { AttemptStatus, ExamStatus } from '@prisma/client';
import { errorHandler, successResponse } from '@/app/lib/api/errors';
import { requireStudent } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';

const COMPLETED_ATTEMPTS_LIMIT = 10;

type LowercaseExamStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';
type LowercaseAttemptStatus = 'in-progress' | 'submitted' | 'abandoned' | 'terminated';

interface SerializedExam {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  duration: number;
  startTime: string | null;
  endTime: string | null;
  maxAttempts: number;
  settings: unknown;
  status: LowercaseExamStatus;
  createdAt: string;
}

interface SerializedAttempt {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  startTime: string;
  endTime: string | null;
  score: number | null;
  status: LowercaseAttemptStatus;
}

const lowerExamStatus = (status: ExamStatus): LowercaseExamStatus =>
  status.toLowerCase() as LowercaseExamStatus;

const lowerAttemptStatus = (status: AttemptStatus): LowercaseAttemptStatus =>
  status.toLowerCase() as LowercaseAttemptStatus;

export async function GET(request: NextRequest) {
  try {
    const user = await requireStudent(request);
    const now = new Date();

    const exams = await prisma.exam.findMany({
      where: {
        enrollments: {
          some: {
            studentId: user.id,
          },
        },
        status: {
          in: [ExamStatus.PUBLISHED, ExamStatus.ONGOING, ExamStatus.COMPLETED],
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    const attempts = await prisma.attempt.findMany({
      where: {
        studentId: user.id,
        status: AttemptStatus.SUBMITTED,
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            startTime: true,
            endTime: true,
            maxAttempts: true,
            settings: true,
            status: true,
            createdById: true,
            createdAt: true,
          },
        },
        submission: {
          select: {
            score: true,
            totalPoints: true,
          },
        },
      },
      orderBy: {
        endTime: 'desc',
      },
      take: COMPLETED_ATTEMPTS_LIMIT,
    });

    const serializeExam = (exam: (typeof exams)[number]): SerializedExam => ({
      id: exam.id,
      title: exam.title,
      description: exam.description ?? '',
      teacherId: exam.createdById,
      duration: exam.duration,
      startTime: exam.startTime?.toISOString() ?? null,
      endTime: exam.endTime?.toISOString() ?? null,
      maxAttempts: exam.maxAttempts,
      settings: exam.settings,
      status: lowerExamStatus(exam.status),
      createdAt: exam.createdAt.toISOString(),
    });

    const availableExams = exams
      .filter((exam) => {
        if (!([ExamStatus.PUBLISHED, ExamStatus.ONGOING] as ExamStatus[]).includes(exam.status)) {
          return false;
        }
        if (exam.startTime && exam.startTime > now) {
          return false;
        }
        if (exam.endTime && exam.endTime < now) {
          return false;
        }
        return true;
      })
      .map(serializeExam);

    const upcomingExams = exams
      .filter((exam) => exam.startTime !== null && exam.startTime > now)
      .sort((a, b) => (a.startTime?.getTime() ?? 0) - (b.startTime?.getTime() ?? 0))
      .map(serializeExam);

    const completedAttempts: SerializedAttempt[] = attempts.map((attempt) => {
      const submission = attempt.submission;
      const totalPoints = submission?.totalPoints ?? null;
      const rawScore = submission?.score ?? attempt.score ?? null;

      let percentage: number | null = null;
      if (rawScore !== null) {
        if (totalPoints && totalPoints > 0) {
          percentage = Number(((rawScore / totalPoints) * 100).toFixed(2));
        } else {
          percentage = Number(rawScore.toFixed(2));
        }
      }

      return {
        id: attempt.id,
        examId: attempt.examId,
        examTitle: attempt.exam.title,
        studentId: attempt.studentId,
        startTime: attempt.startTime.toISOString(),
        endTime: attempt.endTime?.toISOString() ?? null,
        score: percentage,
        status: lowerAttemptStatus(attempt.status),
      };
    });

    const stats = {
      totalExams: exams.length,
      completedExams: completedAttempts.length,
      averageScore:
        completedAttempts.length > 0
          ? Number(
              (
                completedAttempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) /
                completedAttempts.length
              ).toFixed(2)
            )
          : 0,
      upcomingExams: upcomingExams.length,
    };

    return successResponse({
      availableExams,
      upcomingExams,
      completedAttempts,
      stats,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
