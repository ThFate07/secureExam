"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Badge } from '../../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';
import { ArrowLeft, Save, Plus, Trash2, Upload, UserPlus, Users, Search, CheckCircle, GraduationCap } from 'lucide-react';
import { api } from '../../../../lib/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';

interface Question {
  id: string;
  title: string;
  question: string;
  type: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
}

interface ExamQuestion {
  id: string;
  order: number;
  question: Question;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  examQuestions: ExamQuestion[];
  _count?: {
    enrollments: number;
    attempts: number;
  };
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  branch?: string;
  division?: string;
  year?: number;
}

interface Enrollment {
  id: string;
  student: Student;
  enrolledAt: string;
}

export default function ExamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localDuration, setLocalDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  // Enrollment state
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [enrollmentMode, setEnrollmentMode] = useState<'individual' | 'class'>('class');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Enrollment[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Class-based enrollment state
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [branches, setBranches] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);

  // Fetch exam data from API
  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        const data = await api.exams.get(examId);
        setExam(data);
        setLocalTitle(data.title);
        setLocalDescription(data.description);
        setLocalDuration(data.duration);
      } catch (error) {
        console.error('Error fetching exam:', error);
        alert(`Failed to load exam: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  // Fetch enrolled students on initial load
  useEffect(() => {
    const fetchInitialEnrollments = async () => {
      try {
        const enrollmentsResponse = await fetch(`/api/exams/${examId}/enroll`);
        const enrollmentsData = await enrollmentsResponse.json();
        
        if (enrollmentsData.success) {
          setEnrolledStudents(enrollmentsData.data.enrollments || []);
        }
      } catch (error) {
        console.error('Error fetching enrollments:', error);
      }
    };
    
    fetchInitialEnrollments();
  }, [examId]);

  // Fetch all students and enrolled students
  const fetchStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      
      // Fetch all students from the teacher/students endpoint
      const studentsResponse = await fetch('/api/teacher/students');
      const studentsData = await studentsResponse.json();
      
      if (studentsData.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const students = studentsData.data.students.map((s: any) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          email: s.email,
          avatar: s.avatar,
          branch: s.branch,
          division: s.division,
          year: s.year
        }));
        setAllStudents(students);
      }

      // Fetch enrolled students for this exam
      const enrollmentsResponse = await fetch(`/api/exams/${examId}/enroll`);
      const enrollmentsData = await enrollmentsResponse.json();
      
      if (enrollmentsData.success) {
        setEnrolledStudents(enrollmentsData.data.enrollments || []);
      }

      // Fetch available classes
      const classesResponse = await fetch('/api/teacher/classes');
      const classesData = await classesResponse.json();
      
      if (classesData.success) {
        setBranches(classesData.data.branches || []);
        setDivisions(classesData.data.divisions || []);
        setYears(classesData.data.years || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
    }
  }, [examId]);

  // Fetch students when dialog opens
  useEffect(() => {
    if (showEnrollDialog) {
      fetchStudents();
    }
  }, [showEnrollDialog, fetchStudents]);

  // Handle student selection
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Handle enrollment
  const handleEnrollStudents = async () => {
    if (enrollmentMode === 'individual' && selectedStudentIds.length === 0) {
      alert('Please select at least one student');
      return;
    }

    if (enrollmentMode === 'class' && !selectedBranch && !selectedDivision && !selectedYear) {
      alert('Please select at least one class criteria (branch, division, or year)');
      return;
    }

    setEnrolling(true);
    try {
      let response;
      
      if (enrollmentMode === 'class') {
        // Class-based enrollment
        response = await fetch(`/api/exams/${examId}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            enrollByClass: true,
            branch: selectedBranch || undefined,
            division: selectedDivision || undefined,
            year: selectedYear ? parseInt(selectedYear) : undefined,
          }),
        });
      } else {
        // Individual enrollment
        response = await fetch(`/api/exams/${examId}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ studentIds: selectedStudentIds }),
        });
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to enroll students');
      }
      
      // Refresh exam data to update enrollment count
      const updatedExam = await api.exams.get(examId);
      setExam(updatedExam);
      
      // Refresh enrolled students list
      await fetchStudents();
      
      // Clear selection and close dialog
      setSelectedStudentIds([]);
      setSelectedBranch('');
      setSelectedDivision('');
      setSelectedYear('');
      setShowEnrollDialog(false);
      
      alert(`Successfully enrolled ${data.data.enrolled} student(s)!`);
    } catch (error) {
      console.error('Error enrolling students:', error);
      alert(`Failed to enroll students: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setEnrolling(false);
    }
  };

  // Filter students based on search and exclude already enrolled
  const enrolledStudentIds = enrolledStudents.map(e => e.student.id);
  const availableStudents = allStudents.filter(student => 
    !enrolledStudentIds.includes(student.id) &&
    (student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     student.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSave = useCallback(async () => {
    if (!exam) return;
    setSaving(true);
    try {
      const updatedExam = await api.exams.update(exam.id, {
        title: localTitle.trim() || 'Untitled Exam',
        description: localDescription.trim(),
        duration: localDuration > 0 ? localDuration : 30,
      });
      setExam(updatedExam);
      alert('Exam saved successfully.');
    } catch (error) {
      console.error('Error saving exam:', error);
      alert(`Failed to save exam: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [exam, localTitle, localDescription, localDuration]);

  const handlePublish = useCallback(async () => {
    if (!exam) return;
    
    // Validation checks
    if (exam.examQuestions.length === 0) {
      alert('Cannot publish exam without questions!');
      return;
    }

    if (!exam._count || exam._count.enrollments === 0) {
      alert('Cannot publish exam without enrolled students!');
      return;
    }
    
    if (!confirm(`Publish "${exam.title}"? This will make it available to students.`)) {
      return;
    }
    
    setPublishing(true);
    try {
      const result = await api.exams.publish(exam.id);
      setExam(result.exam);
      alert('Exam published successfully! It is now live.');
      router.push('/dashboard/teacher')
    } catch (error) {
      console.error('Error publishing exam:', error);
      alert(`Failed to publish exam: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPublishing(false);
    }
  }, [exam]);

  const totalAttempts = exam?._count?.attempts || 0;

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-4 flex items-center">
          <Button variant="outline" onClick={() => router.push('/dashboard/teacher')} className="mr-4"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          <h1 className="text-2xl font-semibold">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-4 flex items-center">
          <Button variant="outline" onClick={() => router.push('/dashboard/teacher')} className="mr-4"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          <h1 className="text-2xl font-semibold">Exam Not Found</h1>
        </div>
        <p className="text-gray-600">The exam may have been deleted.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Exam</h1>
            <Badge 
              variant="outline"
              className={exam.status === 'DRAFT' 
                ? 'bg-yellow-50 text-yellow-700 border-yellow-300 font-medium' 
                : exam.status === 'PUBLISHED'
                ? 'bg-green-50 text-green-700 border-green-300 font-medium'
                : 'bg-blue-50 text-blue-700 border-blue-300 font-medium'
              }
            >
              {exam.status === 'DRAFT' ? 'Draft' : exam.status === 'PUBLISHED' ? 'Published' : exam.status}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exam.status !== 'DRAFT' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push(`/dashboard/teacher/exam/${examId}/submissions`)}
              className="text-sm"
            >
              View Submissions
            </Button>
          )}
          <Button 
            variant="destructive" 
            size="sm"
            onClick={async () => { 
              if (confirm('Delete this exam?')) {
                try {
                  await api.exams.delete(exam.id);
                  router.push('/dashboard/teacher');
                } catch (error) {
                  console.error('Error deleting exam:', error);
                  alert(`Failed to delete exam: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }
            }}
            className="text-sm"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {exam.status === 'DRAFT' && (
            <Button 
              onClick={handlePublish} 
              disabled={publishing}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
            >
              <Upload className="h-4 w-4 mr-1" />
              {publishing ? 'Publishing...' : 'Publish Exam'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={localTitle} onChange={e => setLocalTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={localDescription} onChange={e => setLocalDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input id="duration" type="number" min={1} value={localDuration} onChange={e => setLocalDuration(Number(e.target.value))} className="w-32" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions ({exam.examQuestions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {exam.examQuestions.length === 0 && (
            <p className="text-sm text-gray-600">No questions yet. Add questions to this exam.</p>
          )}
          {exam.examQuestions.map((eq, idx) => (
            <div key={eq.id} className="border rounded p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{idx + 1}. {eq.question.question}</p>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">{eq.question.points} pts</span>
              </div>
              {eq.question.options && Array.isArray(eq.question.options) && (
                <ul className="text-sm list-disc ml-6 space-y-1">
                  {(eq.question.options as string[]).map((opt: string, i: number) => (
                    <li key={i}>{opt}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Add Question</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enrolled Students ({exam._count?.enrollments || 0})
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowEnrollDialog(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Enroll Students
          </Button>
        </CardHeader>
        <CardContent>
          {enrolledStudents.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No students enrolled yet</p>
              <p className="text-sm text-gray-500 mb-4">
                You need to enroll at least one student before publishing this exam
              </p>
              <Button 
                variant="outline"
                onClick={() => setShowEnrollDialog(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Enroll Your First Student
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {enrolledStudents.slice(0, 5).map((enrollment) => (
                <div 
                  key={enrollment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {enrollment.student.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{enrollment.student.name}</p>
                      <p className="text-sm text-gray-500">{enrollment.student.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </Badge>
                </div>
              ))}
              {enrolledStudents.length > 5 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  + {enrolledStudents.length - 5} more students
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Attempts</p>
            <p className="text-lg font-semibold">{totalAttempts}</p>
          </div>
          <div>
            <p className="text-gray-500">Enrollments</p>
            <p className="text-lg font-semibold">{exam._count?.enrollments || 0}</p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p className="text-lg font-semibold">{new Date(exam.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Updated</p>
            <p className="text-lg font-semibold">{new Date(exam.updatedAt).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Enroll Students in Exam</DialogTitle>
            <DialogDescription>
              Select students to enroll in &quot;{exam.title}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Enrollment Mode Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setEnrollmentMode('class')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  enrollmentMode === 'class'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <GraduationCap className="inline h-4 w-4 mr-2" />
                By Class/Division
              </button>
              <button
                onClick={() => setEnrollmentMode('individual')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  enrollmentMode === 'individual'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="inline h-4 w-4 mr-2" />
                Individual Students
              </button>
            </div>

            {/* Class-based Enrollment */}
            {enrollmentMode === 'class' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Select Class Criteria</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Choose branch, division, and/or year to enroll all matching students
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="branch" className="text-sm font-medium mb-1.5 block">
                        Branch
                      </Label>
                      <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                        <SelectTrigger id="branch" className="w-full">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Branches</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch} value={branch}>
                              {branch}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="division" className="text-sm font-medium mb-1.5 block">
                        Division
                      </Label>
                      <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                        <SelectTrigger id="division" className="w-full">
                          <SelectValue placeholder="Select division" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Divisions</SelectItem>
                          {divisions.map((division) => (
                            <SelectItem key={division} value={division}>
                              Division {division}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="year" className="text-sm font-medium mb-1.5 block">
                        Year
                      </Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger id="year" className="w-full">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Years</SelectItem>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              Year {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(selectedBranch || selectedDivision || selectedYear) && (
                    <div className="mt-4 p-3 bg-white rounded border border-blue-300">
                      <p className="text-sm font-medium text-blue-900">
                        Selected: {' '}
                        {[
                          selectedBranch && `Branch: ${selectedBranch}`,
                          selectedDivision && `Division: ${selectedDivision}`,
                          selectedYear && `Year: ${selectedYear}`,
                        ].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {allStudents.filter(student => 
                          (!selectedBranch || student.branch === selectedBranch) &&
                          (!selectedDivision || student.division === selectedDivision) &&
                          (!selectedYear || student.year?.toString() === selectedYear) &&
                          !enrolledStudentIds.includes(student.id)
                        ).length} student(s) will be enrolled
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Individual Student Enrollment */}
            {enrollmentMode === 'individual' && (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search students by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Available Students */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-700">
                    Available Students ({availableStudents.length})
                  </h3>
                  
                  {loadingStudents ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Loading students...</p>
                    </div>
                  ) : availableStudents.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">
                        {searchTerm ? 'No students match your search' : 'All students are already enrolled'}
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                      {availableStudents.map((student) => {
                        const isSelected = selectedStudentIds.includes(student.id);
                        return (
                          <label
                            key={student.id}
                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                              isSelected ? 'bg-blue-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-gray-600 font-semibold">
                                {student.name.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{student.name}</p>
                              <p className="text-sm text-gray-500 truncate">
                                {student.email}
                                {student.branch && ` • ${student.branch}`}
                                {student.division && ` Div ${student.division}`}
                                {student.year && ` • Year ${student.year}`}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selection Summary */}
                {selectedStudentIds.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <strong>{selectedStudentIds.length}</strong> student{selectedStudentIds.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Already Enrolled Section */}
            {enrolledStudents.length > 0 && (
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">
                    Already Enrolled ({enrolledStudents.length})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {enrolledStudents.slice(0, 10).map((enrollment) => (
                    <Badge key={enrollment.id} variant="outline" className="bg-white">
                      {enrollment.student.name}
                    </Badge>
                  ))}
                  {enrolledStudents.length > 10 && (
                    <Badge variant="outline" className="bg-white">
                      +{enrolledStudents.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEnrollDialog(false);
                  setSelectedStudentIds([]);
                  setSearchTerm('');
                  setSelectedBranch('');
                  setSelectedDivision('');
                  setSelectedYear('');
                }}
                disabled={enrolling}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnrollStudents}
                disabled={
                  enrolling || 
                  (enrollmentMode === 'individual' && selectedStudentIds.length === 0) ||
                  (enrollmentMode === 'class' && !selectedBranch && !selectedDivision && !selectedYear)
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {enrolling ? 'Enrolling...' : enrollmentMode === 'individual' 
                  ? `Enroll ${selectedStudentIds.length} Student${selectedStudentIds.length !== 1 ? 's' : ''}`
                  : 'Enroll Class'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}