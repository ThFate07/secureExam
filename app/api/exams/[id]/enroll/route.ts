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
    const body = await request.json();

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

    let studentIds: string[] = [];

    // Handle class-based enrollment
    if (body.enrollByClass && (body.branch || body.division || body.year !== undefined)) {
      const whereClause: {
        role: 'STUDENT';
        branch?: string;
        division?: string;
        year?: number;
      } = {
        role: 'STUDENT',
      };

      if (body.branch) whereClause.branch = body.branch;
      if (body.division) whereClause.division = body.division;
      if (body.year !== undefined && body.year !== null) whereClause.year = body.year;

      const classStudents = await prisma.user.findMany({
        where: whereClause,
        select: { id: true },
      });

      studentIds = classStudents.map(s => s.id);

      if (studentIds.length === 0) {
        return successResponse({ 
          error: 'No students found matching the specified class criteria',
          enrolled: 0 
        }, 400);
      }
    } else {
      // Handle manual student selection
      const data = await validateRequest(request, enrollStudentSchema);
      studentIds = data.studentIds;

      // Verify all students exist and are students
      const students = await prisma.user.findMany({
        where: {
          id: { in: studentIds },
          role: 'STUDENT',
        },
      });

      if (students.length !== studentIds.length) {
        return successResponse({ error: 'Some students not found or invalid role' }, 400);
      }
    }

    // Enroll students (using createMany with skipDuplicates)
    const result = await prisma.enrollment.createMany({
      data: studentIds.map((studentId) => ({
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
      changes: body.enrollByClass 
        ? { branch: body.branch, division: body.division, year: body.year, count: result.count }
        : { studentIds },
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
