import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { getCurrentUser } from '@/app/lib/api/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    return successResponse({ user });
  } catch (error) {
    return errorHandler(error);
  }
}
