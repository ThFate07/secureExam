import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { registerSchema } from '@/app/lib/api/validation';
import { errorHandler, successResponse, validateRequest } from '@/app/lib/api/errors';
import prisma from '@/app/lib/prisma';
import { createAuditLog, AuditAction } from '@/app/lib/api/audit';
import { generateToken } from '@/app/lib/api/auth';
import { cookies } from 'next/headers';
import { rateLimit } from '@/app/lib/api/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    await rateLimit(request, { maxRequests: 5, windowMs: 60000 });

    // Validate request
    const data = await validateRequest(request, registerSchema);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return successResponse({ error: 'User with this email already exists' }, 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

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
      action: AuditAction.USER_CREATED,
      entity: 'User',
      entityId: user.id,
      request,
    });

    return successResponse({ user, token }, 201);
  } catch (error) {
    return errorHandler(error);
  }
}
