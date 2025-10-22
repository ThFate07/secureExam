# Class-Based Student Enrollment Feature

## Overview
The system has been enhanced to support class-based student enrollment. Teachers can now enroll students by selecting a class (branch, division, and/or year) instead of manually selecting individual students.

## Changes Made

### 1. Database Schema Updates (`prisma/schema.prisma`)
Added new fields to the `User` model for student class information:
- `branch`: Student's branch (e.g., "CMPN", "IT", "EXTC", "MECH")
- `division`: Student's division (e.g., "A", "B", "C")
- `year`: Student's academic year (1, 2, 3, 4)
- `rollNumber`: Student's roll number
- Added indexes for `branch`, `division`, and `year` for efficient querying

### 2. New API Endpoint (`app/api/teacher/classes/route.ts`)
Created a new endpoint to fetch available class combinations:
- **GET** `/api/teacher/classes`
- Returns:
  - List of unique branches
  - List of unique divisions
  - List of unique years
  - Class combinations with student counts

### 3. Updated Enrollment API (`app/api/exams/[id]/enroll/route.ts`)
Enhanced the enrollment endpoint to support two modes:
- **Manual enrollment**: Select individual students (existing functionality)
- **Class-based enrollment**: Enroll all students matching class criteria
  - Can filter by branch, division, and/or year
  - Automatically finds and enrolls all matching students

### 4. Enhanced UI (`app/dashboard/teacher/exam/[id]/page.tsx`)
Added a tabbed enrollment dialog with two modes:
- **By Class/Division Tab**:
  - Dropdown selectors for Branch, Division, and Year
  - Real-time preview of how many students will be enrolled
  - Flexible filtering (can select one or multiple criteria)
  
- **Individual Students Tab**:
  - Search functionality
  - Checkbox selection for individual students
  - Shows student class information in the list

### 5. Registration Form Updates (`app/components/auth/AuthForm.tsx`)
Added optional class information fields for student registration:
- Branch input
- Division input
- Year dropdown (1-4)
- Roll number input
- Fields only appear when "Student" role is selected

### 6. Registration API Updates (`app/api/auth/register/route.ts`)
Updated to handle the new student class fields during registration.

### 7. Validation Schema Updates (`app/lib/api/validation.ts`)
Added optional fields to the registration schema:
- `branch`
- `division`
- `year`
- `rollNumber`

### 8. Database Seed Updates (`prisma/seed.ts`)
Added sample students with class information:
- 2 students in CMPN Division A, Year 2
- 2 students in CMPN Division B, Year 2
- 2 students in IT Division A, Year 2
- 2 students in EXTC (Year 3)

## Usage Examples

### For Teachers:
1. **Enroll by Class**:
   - Open an exam's enrollment dialog
   - Select "By Class/Division" tab
   - Choose filters:
     - Branch: CMPN
     - Division: A
     - Year: 2
   - Click "Enroll Class" to enroll all matching students

2. **Enroll Individual Students**:
   - Open an exam's enrollment dialog
   - Select "Individual Students" tab
   - Search and select specific students
   - Click "Enroll X Students"

### For Students:
During registration, optionally provide:
- Branch (e.g., CMPN, IT, EXTC)
- Division (e.g., A, B, C)
- Year (1, 2, 3, or 4)
- Roll Number (e.g., CMPN-A-001)

## Benefits

1. **Time-Saving**: Teachers can enroll entire classes with a few clicks instead of selecting students individually
2. **Flexibility**: Can enroll by branch only, division only, or any combination
3. **Scalability**: Easily manage large classes with hundreds of students
4. **Organization**: Better student data organization with class information
5. **Backward Compatible**: Manual individual selection still works for specific use cases

## API Request Examples

### Enroll by Class
```json
POST /api/exams/{examId}/enroll
{
  "enrollByClass": true,
  "branch": "CMPN",
  "division": "A",
  "year": 2
}
```

### Enroll Individual Students
```json
POST /api/exams/{examId}/enroll
{
  "studentIds": ["student-id-1", "student-id-2"]
}
```

## Database Migration
A migration was created to add the new fields:
- Migration: `20251022094032_add_student_class_info`

To apply the migration:
```bash
npx prisma migrate dev
```

## Future Enhancements (Optional)

1. **Import Students**: Bulk import students from CSV with class information
2. **Class Management**: Separate admin page to manage class structures
3. **Department Hierarchy**: Add department/college-level organization
4. **Academic Year**: Track which academic year/semester students belong to
5. **Class-wise Analytics**: Generate reports grouped by class
