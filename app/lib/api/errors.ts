import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        errors: error.errors,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation error',
        errors: error.issues,
      },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
    },
    { status: 500 }
  );
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      // Log validation errors for debugging
      console.error('Validation errors:', error.issues);
      throw new ApiError(400, 'Validation error', error.issues);
    }
    throw error;
  }
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}
