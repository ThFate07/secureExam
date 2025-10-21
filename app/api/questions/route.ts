import { NextRequest } from 'next/server';
import { errorHandler, successResponse } from '@/app/lib/api/errors';
import { requireTeacher } from '@/app/lib/api/auth';
import { createQuestionSchema } from '@/app/lib/api/validation';
import { validateRequest } from '@/app/lib/api/errors';
import prisma from '@/app/lib/prisma';
import { createAuditLog, AuditAction } from '@/app/lib/api/audit';
import { rateLimit } from '@/app/lib/api/rateLimit';

// GET /api/questions - List all questions
export async function GET(request: NextRequest) {
  try {
    await requireTeacher(request);
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const subject = searchParams.get('subject');
    const tags = searchParams.get('tags');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    
    if (type) {
      where.type = type;
    }
    
    if (subject) {
      where.subject = subject;
    }
    
    if (tags) {
      where.tags = {
        hasSome: tags.split(','),
      };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { question: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch questions
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.question.count({ where }),
    ]);

    return successResponse({
      questions,
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

// POST /api/questions - Create a new question
export async function POST(request: NextRequest) {
  try {
    await rateLimit(request, { maxRequests: 50, windowMs: 60000 });
    
    const user = await requireTeacher(request);
    const data = await validateRequest(request, createQuestionSchema);

    // Create question
    const question = await prisma.question.create({
      data: {
        title: data.title,
        type: data.type,
        question: data.question,
        options: data.options as never,
        correctAnswer: data.correctAnswer,
        points: data.points,
        tags: data.tags,
        subject: data.subject,
        difficulty: data.difficulty,
        metadata: data.metadata as never,
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.QUESTION_CREATED,
      entity: 'Question',
      entityId: question.id,
      request,
    });

    return successResponse(question, 201);
  } catch (error) {
    return errorHandler(error);
  }
}
