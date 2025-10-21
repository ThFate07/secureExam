import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { ApiError } from './errors';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
  });
}

export async function getCurrentUser(request?: NextRequest): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    
    // Fetch full user data from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      return null;
    }

    return user as AuthUser;
  } catch {
    return null;
  }
}

export async function requireAuth(request?: NextRequest): Promise<AuthUser> {
  const user = await getCurrentUser(request);
  
  if (!user) {
    throw new ApiError(401, 'Authentication required');
  }

  return user;
}

export async function requireRole(
  roles: ('STUDENT' | 'TEACHER' | 'ADMIN')[],
  request?: NextRequest
): Promise<AuthUser> {
  const user = await requireAuth(request);

  if (!roles.includes(user.role)) {
    throw new ApiError(403, 'Insufficient permissions');
  }

  return user;
}

export async function requireTeacher(request?: NextRequest): Promise<AuthUser> {
  return requireRole(['TEACHER', 'ADMIN'], request);
}

export async function requireStudent(request?: NextRequest): Promise<AuthUser> {
  return requireRole(['STUDENT'], request);
}

export async function optionalAuth(request?: NextRequest): Promise<AuthUser | null> {
  return getCurrentUser(request);
}
