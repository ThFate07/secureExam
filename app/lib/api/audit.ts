import prisma from '../prisma';
import { NextRequest } from 'next/server';
import { getClientIp, getUserAgent } from './errors';

export interface AuditLogData {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  request?: NextRequest;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        changes: data.changes as never,
        ipAddress: data.request ? getClientIp(data.request) : undefined,
        userAgent: data.request ? getUserAgent(data.request) : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

export const AuditAction = {
  // User actions
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  
  // Exam actions
  EXAM_CREATED: 'EXAM_CREATED',
  EXAM_UPDATED: 'EXAM_UPDATED',
  EXAM_DELETED: 'EXAM_DELETED',
  EXAM_PUBLISHED: 'EXAM_PUBLISHED',
  EXAM_STARTED: 'EXAM_STARTED',
  EXAM_SUBMITTED: 'EXAM_SUBMITTED',
  
  // Question actions
  QUESTION_CREATED: 'QUESTION_CREATED',
  QUESTION_UPDATED: 'QUESTION_UPDATED',
  QUESTION_DELETED: 'QUESTION_DELETED',
  
  // Submission actions
  SUBMISSION_GRADED: 'SUBMISSION_GRADED',
  SUBMISSION_FLAGGED: 'SUBMISSION_FLAGGED',
  
  // Enrollment actions
  STUDENT_ENROLLED: 'STUDENT_ENROLLED',
  STUDENT_UNENROLLED: 'STUDENT_UNENROLLED',
} as const;
