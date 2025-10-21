import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireTeacher } from '@/app/lib/api/auth';
import { updateQuestionSchema } from '@/app/lib/api/validation';
import { validateRequest } from '@/app/lib/api/errors';
import prisma from '@/app/lib/prisma';
import { createAuditLog, AuditAction } from '@/app/lib/api/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/questions/:id - Get a single question
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireTeacher(request);
    const { id } = await context.params;

    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    return successResponse(question);
  } catch (error) {
    return errorHandler(error);
  }
}

// PUT /api/questions/:id - Update a question
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireTeacher(request);
    const { id } = await context.params;
    const data = await validateRequest(request, updateQuestionSchema);

    // Check if question exists
    const existingQuestion = await prisma.question.findUnique({
      where: { id },
    });

    if (!existingQuestion) {
      throw new ApiError(404, 'Question not found');
    }

    // Update question
    const question = await prisma.question.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.type && { type: data.type }),
        ...(data.question && { question: data.question }),
        ...(data.options && { options: data.options as never }),
        ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer }),
        ...(data.points !== undefined && { points: data.points }),
        ...(data.tags && { tags: data.tags }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.difficulty && { difficulty: data.difficulty }),
        ...(data.metadata && { metadata: data.metadata as never }),
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.QUESTION_UPDATED,
      entity: 'Question',
      entityId: question.id,
      changes: data,
      request,
    });

    return successResponse(question);
  } catch (error) {
    return errorHandler(error);
  }
}

// DELETE /api/questions/:id - Delete a question
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireTeacher(request);
    const { id } = await context.params;

    // Check if question exists
    const existingQuestion = await prisma.question.findUnique({
      where: { id },
    });

    if (!existingQuestion) {
      throw new ApiError(404, 'Question not found');
    }

    // Check if question is used in any exams
    const usageCount = await prisma.examQuestion.count({
      where: { questionId: id },
    });

    if (usageCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete question. It is used in ${usageCount} exam(s).`
      );
    }

    // Delete question
    await prisma.question.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.QUESTION_DELETED,
      entity: 'Question',
      entityId: id,
      request,
    });

    return successResponse({ message: 'Question deleted successfully' });
  } catch (error) {
    return errorHandler(error);
  }
}
