import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireAuth } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';
import { getFileUrl } from '@/app/lib/storage';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/media/snapshots/:id - Get a snapshot with signed URL
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    // Get snapshot
    const snapshot = await prisma.snapshot.findUnique({
      where: { id },
      include: {
        attempt: {
          include: {
            exam: true,
          },
        },
      },
    });

    if (!snapshot) {
      throw new ApiError(404, 'Snapshot not found');
    }

    // Check permissions
    const isOwner = snapshot.attempt.studentId === user.id;
    const isExamCreator = snapshot.attempt.exam.createdById === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isExamCreator && !isAdmin) {
      throw new ApiError(403, 'You do not have permission to view this snapshot');
    }

    // Get signed URL if using S3, or direct URL for local storage
    const signedUrl = await getFileUrl(snapshot.storageKey);

    return successResponse({
      ...snapshot,
      signedUrl,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
