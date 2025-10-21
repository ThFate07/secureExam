import { NextRequest } from 'next/server';
import { errorHandler, successResponse } from '@/app/lib/api/errors';
import { getCurrentUser } from '@/app/lib/api/auth';
import { cookies } from 'next/headers';
import { createAuditLog, AuditAction } from '@/app/lib/api/audit';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (user) {
      // Audit log
      await createAuditLog({
        userId: user.id,
        action: AuditAction.USER_LOGOUT,
        entity: 'User',
        entityId: user.id,
        request,
      });
    }

    // Clear cookie
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');

    return successResponse({ message: 'Logged out successfully' });
  } catch (error) {
    return errorHandler(error);
  }
}
