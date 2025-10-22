import { NextRequest } from 'next/server';
import { errorHandler, successResponse } from '@/app/lib/api/errors';
import { requireTeacher } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireTeacher(request);

    // Get all students from the database
    const allStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        branch: true,
        division: true,
        year: true,
        rollNumber: true,
        createdAt: true,
      },
    });

    // Get all students enrolled in teacher's exams for additional data
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

    // Get student performance data for enrolled students
    const enrolledStudentsData = await Promise.all(
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
          studentId: enrollment.studentId,
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
        };
      })
    );

    // Merge all students with enrollment data
    const studentsData = allStudents.map((student) => {
      const enrollmentData = enrolledStudentsData.find(e => e.studentId === student.id);
      
      return {
        id: student.id,
        studentId: student.id,
        firstName: student.name.split(' ')[0] || student.name,
        lastName: student.name.split(' ').slice(1).join(' ') || '',
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        phone: '', // Not stored in current schema
        enrollmentDate: student.createdAt,
        status: 'active' as const,
        academicStatus: enrollmentData?.academicInfo.gpa && enrollmentData.academicInfo.gpa >= 3.5 
          ? ('honors' as const) 
          : ('regular' as const),
        class: enrollmentData?.class || 'Not Enrolled',
        enrolledClasses: enrollmentData?.enrolledClasses || [],
        branch: student.branch,
        division: student.division,
        year: student.year,
        rollNumber: student.rollNumber,
        academicInfo: enrollmentData?.academicInfo || {
          gpa: 0,
          totalCredits: 0,
          completedCredits: 0,
          semester: 'Current',
          year: 1,
          major: 'Unknown',
        },
        createdAt: student.createdAt,
      };
    });

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
      students: studentsData,
      classes: classes.map((c) => c.title),
    });
  } catch (error) {
    return errorHandler(error);
  }
}
