import { NextRequest } from 'next/server';
import { errorHandler, successResponse } from '@/app/lib/api/errors';
import { requireTeacher } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireTeacher(request);

    // Get all students enrolled in teacher's exams
    const enrollments = await prisma.enrollment.findMany({
      where: {
        exam: {
          createdById: user.id,
        },
      },
      include: {
        student: true,
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      distinct: ['studentId'],
    });

    // Get student performance data
    const studentsData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const attempts = await prisma.attempt.findMany({
          where: {
            studentId: enrollment.studentId,
            exam: {
              createdById: user.id,
            },
          },
          include: {
            exam: true,
            submission: {
              select: {
                score: true,
                totalPoints: true,
              },
            },
          },
        });

        const completedAttempts = attempts.filter(
          (a) => a.status === 'SUBMITTED' && a.submission
        );

        let avgGpa = 0;
        if (completedAttempts.length > 0) {
          const scores = completedAttempts.map((a) => {
            const totalPoints = a.submission?.totalPoints ?? 100;
            const score = a.submission?.score ?? a.score ?? 0;
            return totalPoints > 0 ? (score / totalPoints) * 4.0 : 0;
          });
          avgGpa = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        }

        return {
          id: enrollment.student.id,
          studentId: enrollment.student.id,
          firstName: enrollment.student.name.split(' ')[0] || enrollment.student.name,
          lastName: enrollment.student.name.split(' ').slice(1).join(' ') || '',
          name: enrollment.student.name,
          email: enrollment.student.email,
          phone: '', // Not stored in current schema
          enrollmentDate: enrollment.enrolledAt,
          status: 'active' as const,
          academicStatus: avgGpa >= 3.5 ? ('honors' as const) : ('regular' as const),
          class: enrollment.exam.title,
          enrolledClasses: [enrollment.exam.id],
          academicInfo: {
            gpa: Number(avgGpa.toFixed(2)),
            totalCredits: 0,
            completedCredits: completedAttempts.length * 3,
            semester: 'Current',
            year: 1,
            major: 'Unknown',
          },
          createdAt: enrollment.student.createdAt,
        };
      })
    );

    // Get unique students (in case a student is enrolled in multiple exams)
    const uniqueStudents = studentsData.reduce((acc, student) => {
      const existing = acc.find((s) => s.id === student.id);
      if (!existing) {
        acc.push(student);
      } else {
        // Merge enrolled classes
        existing.enrolledClasses = [
          ...new Set([...existing.enrolledClasses, ...student.enrolledClasses]),
        ];
      }
      return acc;
    }, [] as typeof studentsData);

    // Get classes (unique exam titles)
    const classes = await prisma.exam.findMany({
      where: {
        createdById: user.id,
      },
      select: {
        id: true,
        title: true,
      },
      distinct: ['title'],
    });

    return successResponse({
      students: uniqueStudents,
      classes: classes.map((c) => c.title),
    });
  } catch (error) {
    return errorHandler(error);
  }
}
