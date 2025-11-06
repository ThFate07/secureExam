import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireAuth } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';
import { uploadFile, base64ToBuffer, validateFileSize, validateImageType, getFileUrl, STORAGE_PROVIDER, getLocalFileBuffer } from '@/app/lib/storage';
import { z } from 'zod';
import { validateRequest } from '@/app/lib/api/errors';

const uploadSnapshotSchema = z.object({
  attemptId: z.string().cuid(),
  image: z.string(), // base64 encoded
  type: z.enum(['WEBCAM', 'SCREEN', 'DOCUMENT']).default('WEBCAM'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/media/snapshots - Get the latest snapshot for an attempt/student
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const url = new URL(request.url);
    const attemptIdParam = url.searchParams.get('attemptId');
    const examIdParam = url.searchParams.get('examId');
    const studentIdParam = url.searchParams.get('studentId');

    if (!attemptIdParam && (!examIdParam || !studentIdParam)) {
      throw new ApiError(400, 'Provide attemptId or both examId and studentId');
    }

    const attempt = attemptIdParam
      ? await prisma.attempt.findUnique({
          where: { id: attemptIdParam },
          include: { exam: true },
        })
      : await prisma.attempt.findFirst({
          where: {
            examId: examIdParam!,
            studentId: studentIdParam!,
          },
          include: { exam: true },
          orderBy: { startTime: 'desc' },
        });

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    const canViewSnapshot =
      user.role === 'ADMIN' ||
      (user.role === 'STUDENT' && attempt.studentId === user.id) ||
      (user.role === 'TEACHER' && attempt.exam.createdById === user.id);

    if (!canViewSnapshot) {
      throw new ApiError(403, 'You do not have permission to view this snapshot');
    }

    const latestSnapshot = await prisma.snapshot.findFirst({
      where: {
        attemptId: attempt.id,
        type: 'WEBCAM',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestSnapshot) {
      return successResponse(null);
    }

    const signedUrl = await getFileUrl(latestSnapshot.storageKey);

    let inlineData: string | null = null;
    if (STORAGE_PROVIDER === 'local') {
      const buffer = await getLocalFileBuffer(latestSnapshot.storageKey);
      if (buffer) {
        const ext = latestSnapshot.storageKey.split('.').pop()?.toLowerCase();
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        inlineData = `data:${mime};base64,${buffer.toString('base64')}`;
      }
    }

    return successResponse({
      id: latestSnapshot.id,
      attemptId: latestSnapshot.attemptId,
      type: latestSnapshot.type,
      capturedAt: latestSnapshot.createdAt,
      signedUrl,
      inlineData,
      size: latestSnapshot.size,
    });
  } catch (error) {
    return errorHandler(error);
  }
}

// POST /api/media/snapshots - Upload a snapshot
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const data = await validateRequest(request, uploadSnapshotSchema);

    // Verify attempt belongs to user
    const attempt = await prisma.attempt.findUnique({
      where: { id: data.attemptId },
    });

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    if (attempt.studentId !== user.id && user.role !== 'ADMIN') {
      throw new ApiError(403, 'Not your attempt');
    }

    // Convert base64 to buffer
    const buffer = base64ToBuffer(data.image);

    // Validate file size
    const maxSize = parseInt(process.env.MAX_SNAPSHOT_SIZE_MB || '5');
    if (!validateFileSize(buffer.length, maxSize)) {
      throw new ApiError(400, `File size exceeds ${maxSize}MB limit`);
    }

    // Determine content type from base64 prefix
    let contentType = 'image/jpeg';
    if (data.image.startsWith('data:image/png')) {
      contentType = 'image/png';
    } else if (data.image.startsWith('data:image/webp')) {
      contentType = 'image/webp';
    }

    if (!validateImageType(contentType)) {
      throw new ApiError(400, 'Invalid image type');
    }

    // Upload file
    const uploadResult = await uploadFile({
      buffer,
      filename: `snapshot-${attempt.id}-${Date.now()}.${contentType.split('/')[1]}`,
      contentType,
      metadata: {
        attemptId: data.attemptId,
        studentId: user.id,
        type: data.type,
        ...(data.metadata || {}),
      },
    });

    // Save snapshot record
    const snapshot = await prisma.snapshot.create({
      data: {
        attemptId: data.attemptId,
        url: uploadResult.url,
        storageKey: uploadResult.key,
        type: data.type,
        size: uploadResult.size,
        metadata: {
          ...(data.metadata || {}),
          contentType,
        } as never,
      },
    });

    return successResponse(snapshot, 201);
  } catch (error) {
    return errorHandler(error);
  }
}
