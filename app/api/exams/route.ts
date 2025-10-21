import { NextRequest } from 'next/server';
import { errorHandler, successResponse } from '@/app/lib/api/errors';
import { requireAuth, requireTeacher } from '@/app/lib/api/auth';
import { createExamSchema } from '@/app/lib/api/validation';
import { validateRequest } from '@/app/lib/api/errors';
import prisma from '@/app/lib/prisma';
import { createAuditLog, AuditAction } from '@/app/lib/api/audit';
import { rateLimit } from '@/app/lib/api/rateLimit';

// GET /api/exams - List exams (teachers see all their exams, students see enrolled exams)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Teachers see their own exams
    if (user.role === 'TEACHER' || user.role === 'ADMIN') {
      where.createdById = user.id;
    } else {
      // Students see only exams they're enrolled in
      where.enrollments = {
        some: {
          studentId: user.id,
        },
      };
    }

    if (status) {
      where.status = status;
    }

    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.exam.count({ where }),
    ]);

    return successResponse({
      exams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorHandler(error);
  }
}

// POST /api/exams - Create a new exam
export async function POST(request: NextRequest) {
  try {
    await rateLimit(request, { maxRequests: 20, windowMs: 60000 });
    
    const user = await requireTeacher(request);
    const data = await validateRequest(request, createExamSchema);

    // Verify all questions exist
    const questions = await prisma.question.findMany({
      where: {
        id: { in: data.questionIds },
      },
    });

    if (questions.length !== data.questionIds.length) {
      return successResponse({ error: 'Some questions not found' }, 400);
    }

    // Create exam with questions
    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        description: data.description,
        duration: data.duration,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        maxAttempts: data.maxAttempts,
        passingScore: data.passingScore,
        status: 'DRAFT',
        settings: data.settings as never,
        createdById: user.id,
        examQuestions: {
          create: data.questionIds.map((questionId, index) => ({
            questionId,
            order: index,
            randomizeOptions: data.settings.shuffleOptions,
          })),
        },
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
      action: AuditAction.EXAM_CREATED,
      entity: 'Exam',
      entityId: exam.id,
      request,
    });

    return successResponse(exam, 201);
  } catch (error) {
    return errorHandler(error);
  }
}
