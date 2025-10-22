import { NextRequest } from 'next/server';
import { errorHandler, successResponse } from '@/app/lib/api/errors';
import { requireTeacher } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';

// GET /api/teacher/classes - Get available classes/divisions
export async function GET(request: NextRequest) {
  try {
    await requireTeacher(request);

    // Get unique combinations of branch, division, and year
    const students = await prisma.user.findMany({
      where: { 
        role: 'STUDENT',
        OR: [
          { branch: { not: null } },
          { division: { not: null } },
          { year: { not: null } },
        ],
      },
      select: {
        branch: true,
        division: true,
        year: true,
        id: true,
      },
    });

    // Get unique branches
    const branches = [...new Set(students.map(s => s.branch).filter(Boolean))];
    
    // Get unique divisions
    const divisions = [...new Set(students.map(s => s.division).filter(Boolean))];
    
    // Get unique years
    const years = [...new Set(students.map(s => s.year).filter(Boolean))].sort();

    // Get class combinations with student count
    const classMap = new Map<string, { branch?: string; division?: string; year?: number; count: number }>();
    
    students.forEach(student => {
      if (student.branch || student.division || student.year) {
        const key = `${student.branch || ''}_${student.division || ''}_${student.year || ''}`;
        if (!classMap.has(key)) {
          classMap.set(key, {
            branch: student.branch || undefined,
            division: student.division || undefined,
            year: student.year || undefined,
            count: 0,
          });
        }
        classMap.get(key)!.count++;
      }
    });

    const classes = Array.from(classMap.values()).sort((a, b) => {
      // Sort by year, then branch, then division
      if (a.year !== b.year) return (a.year || 0) - (b.year || 0);
      if (a.branch !== b.branch) return (a.branch || '').localeCompare(b.branch || '');
      return (a.division || '').localeCompare(b.division || '');
    });

    return successResponse({
      branches,
      divisions,
      years,
      classes,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
