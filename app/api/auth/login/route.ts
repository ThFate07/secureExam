import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { loginSchema } from '@/app/lib/api/validation';
import { errorHandler, successResponse, validateRequest, ApiError } from '@/app/lib/api/errors';
import prisma from '@/app/lib/prisma';
import { createAuditLog, AuditAction } from '@/app/lib/api/audit';
import { generateToken } from '@/app/lib/api/auth';
import { cookies } from 'next/headers';
import { rateLimit } from '@/app/lib/api/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    await rateLimit(request, { maxRequests: 10, windowMs: 60000 });

    // Validate request
    const data = await validateRequest(request, loginSchema);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.USER_LOGIN,
      entity: 'User',
      entityId: user.id,
      request,
    });

    // Return user data (without password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;

    return successResponse({ user: userWithoutPassword, token });
  } catch (error) {
    return errorHandler(error);
  }
}
