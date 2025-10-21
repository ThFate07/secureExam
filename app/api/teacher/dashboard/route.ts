import { NextRequest } from 'next/server';
import { ExamStatus } from '@prisma/client';
import { errorHandler, successResponse } from '@/app/lib/api/errors';
import { requireTeacher } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';

type LowercaseExamStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';

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

const lowerExamStatus = (status: ExamStatus): LowercaseExamStatus =>
  status.toLowerCase() as LowercaseExamStatus;

export async function GET(request: NextRequest) {
  try {
    const user = await requireTeacher(request);

    // Fetch all exams created by this teacher
    const exams = await prisma.exam.findMany({
      where: {
        createdById: user.id,
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            attempts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get total students enrolled in teacher's courses
    const enrollments = await prisma.enrollment.findMany({
      where: {
        exam: {
          createdById: user.id,
        },
      },
      select: {
        studentId: true,
      },
    });
    
    const totalStudents = new Set(enrollments.map((e) => e.studentId)).size;

    // Get completed exams count (this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const completedThisMonth = await prisma.exam.count({
      where: {
        createdById: user.id,
        status: ExamStatus.COMPLETED,
        updatedAt: {
          gte: startOfMonth,
        },
      },
    });

    const serializeExam = (exam: (typeof exams)[number]): SerializedExam => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      teacherId: exam.createdById,
      duration: exam.duration,
      startTime: exam.startTime?.toISOString() ?? null,
      endTime: exam.endTime?.toISOString() ?? null,
      maxAttempts: exam.maxAttempts,
      settings: exam.settings,
      status: lowerExamStatus(exam.status),
      createdAt: exam.createdAt.toISOString(),
    });

    const serializedExams = exams.map(serializeExam);

    const stats = {
      totalExams: exams.length,
      activeExams: exams.filter(
        (e) => e.status === ExamStatus.PUBLISHED || e.status === ExamStatus.ONGOING
      ).length,
      totalStudents,
      completedExams: completedThisMonth,
    };

    return successResponse({
      exams: serializedExams,
      stats,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
