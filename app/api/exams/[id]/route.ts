import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireAuth, requireTeacher } from '@/app/lib/api/auth';
import { updateExamSchema } from '@/app/lib/api/validation';
import { validateRequest } from '@/app/lib/api/errors';
import prisma from '@/app/lib/prisma';
import { createAuditLog, AuditAction } from '@/app/lib/api/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/exams/:id - Get a single exam
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            enrollments: true,
            attempts: true,
          },
        },
      },
    });

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    // Check permissions
    if (user.role === 'STUDENT') {
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

      // Students shouldn't see correct answers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exam.examQuestions.forEach((eq: any) => {
        delete eq.question.correctAnswer;
      });
    }

    return successResponse(exam);
  } catch (error) {
    return errorHandler(error);
  }
}

// PATCH /api/exams/:id - Update an exam
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireTeacher(request);
    const { id } = await context.params;
    const data = await validateRequest(request, updateExamSchema);

    // Check if exam exists and user owns it
    const existingExam = await prisma.exam.findUnique({
      where: { id },
    });

    if (!existingExam) {
      throw new ApiError(404, 'Exam not found');
    }

    if (existingExam.createdById !== user.id && user.role !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to update this exam');
    }

    // Update exam
    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
        ...(data.maxAttempts !== undefined && { maxAttempts: data.maxAttempts }),
        ...(data.status && { status: data.status }),
        ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
        ...(data.settings && { settings: data.settings as never }),
      },
      include: {
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.EXAM_UPDATED,
      entity: 'Exam',
      entityId: exam.id,
      changes: data,
      request,
    });

    return successResponse(exam);
  } catch (error) {
    return errorHandler(error);
  }
}

// DELETE /api/exams/:id - Delete an exam
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireTeacher(request);
    const { id } = await context.params;

    // Check if exam exists and user owns it
    const existingExam = await prisma.exam.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });

    if (!existingExam) {
      throw new ApiError(404, 'Exam not found');
    }

    if (existingExam.createdById !== user.id && user.role !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to delete this exam');
    }

    // Prevent deletion if there are attempts
    if (existingExam._count.attempts > 0) {
      throw new ApiError(
        400,
        'Cannot delete exam with existing attempts. Consider archiving it instead.'
      );
    }

    // Delete exam (cascade will handle related records)
    await prisma.exam.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.EXAM_DELETED,
      entity: 'Exam',
      entityId: id,
      request,
    });

    return successResponse({ message: 'Exam deleted successfully' });
  } catch (error) {
    return errorHandler(error);
  }
}
