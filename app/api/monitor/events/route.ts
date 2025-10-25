import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError, validateRequest } from '@/app/lib/api/errors';
import { requireAuth } from '@/app/lib/api/auth';
import { monitoringEventSchema } from '@/app/lib/api/validation';
import prisma from '@/app/lib/prisma';
import { rateLimit } from '@/app/lib/api/rateLimit';

// POST /api/monitor/events - Create monitoring event
export async function POST(request: NextRequest) {
  try {
    await rateLimit(request, { maxRequests: 100, windowMs: 60000 });
    
    const user = await requireAuth(request);
    const data = await validateRequest(request, monitoringEventSchema);

    // Create monitoring event
    const event = await prisma.monitoringEvent.create({
      data: {
        examId: data.examId,
        studentId: user.id,
        attemptId: data.attemptId,
        type: data.type,
        severity: data.severity,
        description: data.description,
        metadata: data.metadata as never,
      },
    });

    return successResponse(event, 201);
  } catch (error) {
    return errorHandler(error);
  }
}

// GET /api/monitor/events - List monitoring events
// Query params:
// - examId: required
// - attemptId: optional (filters to a specific attempt)
// - studentId: optional (teachers/admin only; students are restricted to their own id)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const attemptId = searchParams.get('attemptId');
    const studentId = searchParams.get('studentId');

    if (!examId) {
      throw new ApiError(400, 'examId is required');
    }

    // Verify exam exists
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new ApiError(404, 'Exam not found');

    // Authorization:
    // - Students: can only see their own events for this exam (ignore provided studentId)
    // - Teachers/Admin: must be exam owner (or admin) to view other students
    const whereClause: {
      examId: string;
      attemptId?: string | null;
      studentId?: string;
    } = { examId };
    if (attemptId) whereClause.attemptId = attemptId;

    if (user.role === 'STUDENT') {
      whereClause.studentId = user.id;
    } else {
      // Teacher/Admin
      const isOwnerOrAdmin = exam.createdById === user.id || user.role === 'ADMIN';
      if (!isOwnerOrAdmin) throw new ApiError(403, 'Not authorized to view events for this exam');
      if (studentId) whereClause.studentId = studentId;
    }

    const events = await prisma.monitoringEvent.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    return successResponse({ events });
  } catch (error) {
    return errorHandler(error);
  }
}
