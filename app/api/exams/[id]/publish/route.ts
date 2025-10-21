import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireTeacher } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';
import { createAuditLog, AuditAction } from '@/app/lib/api/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/exams/:id/publish - Publish an exam
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireTeacher(request);
    const { id } = await context.params;

    // Check if exam exists and user owns it
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        examQuestions: true,
        enrollments: true,
      },
    });

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    if (exam.createdById !== user.id && user.role !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to publish this exam');
    }

    // Validation
    if (exam.examQuestions.length === 0) {
      throw new ApiError(400, 'Cannot publish exam without questions');
    }

    if (exam.enrollments.length === 0) {
      throw new ApiError(400, 'Cannot publish exam without enrolled students');
    }

    if (exam.status === 'PUBLISHED') {
      throw new ApiError(400, 'Exam is already published');
    }

    // Update status to published
    const updatedExam = await prisma.exam.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: {
        examQuestions: {
          include: {
            question: true,
          },
        },
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.EXAM_PUBLISHED,
      entity: 'Exam',
      entityId: id,
      request,
    });

    return successResponse({
      message: 'Exam published successfully',
      exam: updatedExam,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
