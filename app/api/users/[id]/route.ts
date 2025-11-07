import { NextRequest } from 'next/server';
import { requireTeacher } from '@/app/lib/api/auth';
import { ApiError, errorHandler, successResponse } from '@/app/lib/api/errors';
import prisma from '@/app/lib/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireTeacher(request);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'Student not found');
    }

    const nameSegments = typeof user.name === 'string' ? user.name.trim().split(/\s+/).filter(Boolean) : [];
    const [firstName, ...rest] = nameSegments;
    const lastName = rest.join(' ');

    return successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        firstName: firstName ?? '',
        lastName,
      },
    });
  } catch (error) {
    return errorHandler(error);
  }
}
