import { NextRequest } from 'next/server';
import { errorHandler, successResponse, ApiError } from '@/app/lib/api/errors';
import { requireTeacher } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';
import { AttemptStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireTeacher(request);
    const { id } = params; // This could be attemptId OR we can change this to examId
    const body = await request.json();
    const { studentId, examId } = body; // Get studentId and examId from body

    let attempt;

    // If we have studentId and examId, find the active attempt
    if (studentId && examId) {
      attempt = await prisma.attempt.findFirst({
        where: {
          examId: examId,
          studentId: studentId,
          status: AttemptStatus.IN_PROGRESS,
        },
        include: {
          exam: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
      });
    } else {
      // Fallback to attemptId lookup
      attempt = await prisma.attempt.findUnique({
        where: { id },
        include: {
          exam: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
      });
    }

    if (!attempt) {
      throw new ApiError(404, 'Active attempt not found for this student');
    }

    // Verify the teacher has permission to terminate this exam
    if (attempt.exam.createdById !== user.id) {
      throw new ApiError(403, 'You can only terminate attempts for your own exams');
    }

    // Check if the attempt is in progress
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ApiError(400, `Cannot terminate exam. Current status: ${attempt.status}`);
    }

    // Terminate the attempt
    const terminatedAttempt = await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.TERMINATED,
        endTime: new Date(),
        score: 0, // Set score to 0 for terminated exams
      },
    });

    // Create a monitoring event for the termination
    await prisma.monitoringEvent.create({
      data: {
        examId: attempt.examId,
        studentId: attempt.studentId,
        attemptId: attempt.id,
        type: 'EXAM_SUBMITTED', // Using existing type, but with TERMINATED status it's clear
        severity: 'HIGH',
        description: `Exam terminated by teacher: ${user.name}`,
        metadata: {
          terminatedBy: user.id,
          terminatedByName: user.name,
          reason: 'Teacher terminated exam',
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'TERMINATE_EXAM',
        entity: 'Attempt',
        entityId: attempt.id,
        changes: {
          attemptId: attempt.id,
          studentId: attempt.studentId,
          examId: attempt.examId,
          previousStatus: AttemptStatus.IN_PROGRESS,
          newStatus: AttemptStatus.TERMINATED,
          terminatedBy: user.name,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    });

    return successResponse({
      message: 'Exam terminated successfully',
      attempt: {
        id: terminatedAttempt.id,
        status: terminatedAttempt.status,
        endTime: terminatedAttempt.endTime,
        student: attempt.student,
        exam: {
          id: attempt.exam.id,
          title: attempt.exam.title,
        }
      }
    });
  } catch (error) {
    return errorHandler(error);
  }
}