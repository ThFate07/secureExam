import { NextRequest } from 'next/server';
import { errorHandler, successResponse } from '@/app/lib/api/errors';
import { requireAuth } from '@/app/lib/api/auth';
import { monitoringEventSchema } from '@/app/lib/api/validation';
import { validateRequest } from '@/app/lib/api/errors';
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
