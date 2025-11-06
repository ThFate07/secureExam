import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireAuth } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';
import { analyzeFace } from '@/app/lib/faceDetection';
import { getLocalFileBuffer } from '@/app/lib/storage';
import { STORAGE_PROVIDER } from '@/app/lib/storage';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/media/snapshots/[id]/analyze - Analyze a specific snapshot for face detection
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const params = await context.params;
    const { id: snapshotId } = params;

    // Get snapshot
    const snapshot = await prisma.snapshot.findUnique({
      where: { id: snapshotId },
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
    const canView =
      user.role === 'ADMIN' ||
      (user.role === 'STUDENT' && snapshot.attempt.studentId === user.id) ||
      (user.role === 'TEACHER' && snapshot.attempt.exam.createdById === user.id);

    if (!canView) {
      throw new ApiError(403, 'You do not have permission to analyze this snapshot');
    }

    // Get image buffer
    let imageBuffer: Buffer;
    if (STORAGE_PROVIDER === 'local') {
      const buffer = await getLocalFileBuffer(snapshot.storageKey);
      if (!buffer) {
        throw new ApiError(404, 'Snapshot file not found');
      }
      imageBuffer = buffer;
    } else {
      // For S3, fetch the image
      const response = await fetch(snapshot.url);
      if (!response.ok) {
        throw new ApiError(404, 'Failed to fetch snapshot image');
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    // Get baseline face descriptor from attempt metadata
    let baselineDescriptor: number[] | undefined;
    if (snapshot.attempt.metadata && typeof snapshot.attempt.metadata === 'object') {
      const metadata = snapshot.attempt.metadata as { baselineFaceDescriptor?: number[] };
      baselineDescriptor = metadata.baselineFaceDescriptor;
    }

    // Run face analysis
    const analysis = await analyzeFace(imageBuffer, baselineDescriptor);

    // Get existing metadata from snapshot
    const existingMetadata = (snapshot.metadata as any) || {};

    return successResponse({
      snapshotId: snapshot.id,
      attemptId: snapshot.attemptId,
      analysis: {
        faceCount: analysis.detection.faceCount,
        hasFace: analysis.detection.hasFace,
        hasMultipleFaces: analysis.detection.hasMultipleFaces,
        headPose: analysis.headPose,
        faceMatch: analysis.faceMatch,
        violations: analysis.violations,
      },
      metadata: {
        ...existingMetadata,
        faceCount: analysis.detection.faceCount,
        hasFace: analysis.detection.hasFace,
        hasMultipleFaces: analysis.detection.hasMultipleFaces,
        headPose: analysis.headPose,
        faceMatch: analysis.faceMatch,
      },
    });
  } catch (error) {
    return errorHandler(error);
  }
}

