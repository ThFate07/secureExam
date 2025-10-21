import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireTeacher } from '@/app/lib/api/auth';
import { enrollStudentSchema } from '@/app/lib/api/validation';
import { validateRequest } from '@/app/lib/api/errors';
import prisma from '@/app/lib/prisma';
import { createAuditLog, AuditAction } from '@/app/lib/api/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/exams/:id/enroll - Get enrolled students
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireTeacher(request);
    const { id } = await context.params;

    // Check if exam exists and user owns it
    const exam = await prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    if (exam.createdById !== user.id && user.role !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to view enrollments');
    }

    // Get enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { examId: id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return successResponse({ enrollments });
  } catch (error) {
    return errorHandler(error);
  }
}

// POST /api/exams/:id/enroll - Enroll students in exam
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireTeacher(request);
    const { id } = await context.params;
    const data = await validateRequest(request, enrollStudentSchema);

    // Check if exam exists and user owns it
    const exam = await prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    if (exam.createdById !== user.id && user.role !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to enroll students');
    }

    // Verify all students exist and are students
    const students = await prisma.user.findMany({
      where: {
        id: { in: data.studentIds },
        role: 'STUDENT',
      },
    });

    if (students.length !== data.studentIds.length) {
      return successResponse({ error: 'Some students not found or invalid role' }, 400);
    }

    // Enroll students (using createMany with skipDuplicates)
    const result = await prisma.enrollment.createMany({
      data: data.studentIds.map((studentId) => ({
        examId: id,
        studentId,
      })),
      skipDuplicates: true,
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.STUDENT_ENROLLED,
      entity: 'Enrollment',
      entityId: id,
      changes: { studentIds: data.studentIds },
      request,
    });

    return successResponse({
      message: `${result.count} student(s) enrolled successfully`,
      enrolled: result.count,
    }, 201);
  } catch (error) {
    return errorHandler(error);
  }
}
