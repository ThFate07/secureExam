"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { 
  Plus, 
  BookOpen, 
  Users, 
  BarChart3, 
  Clock, 
  Eye,
  PlayCircle,
  Settings,
  FileText
} from "lucide-react";
import { Exam } from "../../types";

export default function TeacherDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    activeExams: 0,
    totalStudents: 0,
    completedExams: 0,
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'teacher')) {
      router.push("/auth");
      return;
    }

    // Mock data for demonstration
    const mockExams: Exam[] = [
      {
        id: "1",
        title: "Mathematics Final Exam",
        description: "Comprehensive mathematics assessment covering algebra, geometry, and calculus",
        teacherId: user?.id || "",
        duration: 120,
        startTime: new Date("2025-09-25T10:00:00"),
        endTime: new Date("2025-09-25T12:00:00"),
        maxAttempts: 1,
        questions: [],
        settings: {
          shuffleQuestions: true,
          shuffleOptions: true,
          showResultsImmediately: false,
          allowReview: true,
          preventTabSwitching: true,
          requireWebcam: true,
          enableScreenMonitoring: true,
          lockdownBrowser: true,
        },
        status: "published",
        createdAt: new Date("2025-09-20"),
      },
      {
        id: "2",
        title: "Physics Quiz - Chapter 5",
        description: "Quick assessment on electromagnetic waves and optics",
        teacherId: user?.id || "",
        duration: 45,
        startTime: new Date("2025-09-23T14:00:00"),
        endTime: new Date("2025-09-23T14:45:00"),
        maxAttempts: 2,
        questions: [],
        settings: {
          shuffleQuestions: false,
          shuffleOptions: true,
          showResultsImmediately: true,
          allowReview: true,
          preventTabSwitching: true,
          requireWebcam: false,
          enableScreenMonitoring: false,
          lockdownBrowser: false,
        },
        status: "draft",
        createdAt: new Date("2025-09-21"),
      },
    ];

    setExams(mockExams);
    setStats({
      totalExams: mockExams.length,
      activeExams: mockExams.filter(e => e.status === 'published').length,
      totalStudents: 45,
      completedExams: 12,
    });
  }, [user, isAuthenticated, loading, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'teacher') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user.name}!
        </h1>
        <p className="text-gray-600">
          Manage your exams, monitor students, and track performance from your dashboard.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExams}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeExams}</div>
            <p className="text-xs text-muted-foreground">
              Currently published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled in your courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedExams}</div>
            <p className="text-xs text-muted-foreground">
              Exams this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Button 
          className="h-24 text-left justify-start flex-col items-start space-y-2"
          onClick={() => router.push("/dashboard/teacher/create-exam")}
        >
          <Plus className="h-6 w-6" />
          <div>
            <div className="font-semibold">Create New Exam</div>
            <div className="text-sm opacity-80">Set up a new assessment</div>
          </div>
        </Button>

        <Button 
          variant="outline"
          className="h-24 text-left justify-start flex-col items-start space-y-2"
          onClick={() => router.push("/dashboard/teacher/my-exams")}
        >
          <FileText className="h-6 w-6" />
          <div>
            <div className="font-semibold">My Exams</div>
            <div className="text-sm opacity-80">View and manage exams</div>
          </div>
        </Button>

        <Button 
          variant="outline"
          className="h-24 text-left justify-start flex-col items-start space-y-2"
          onClick={() => router.push("/dashboard/teacher/questions")}
        >
          <BookOpen className="h-6 w-6" />
          <div>
            <div className="font-semibold">Question Bank</div>
            <div className="text-sm opacity-80">Manage your questions</div>
          </div>
        </Button>

        <Button 
          variant="outline"
          className="h-24 text-left justify-start flex-col items-start space-y-2"
          onClick={() => router.push("/dashboard/teacher/monitor")}
        >
          <Eye className="h-6 w-6" />
          <div>
            <div className="font-semibold">Monitor Exams</div>
            <div className="text-sm opacity-80">Real-time student monitoring</div>
          </div>
        </Button>
      </div>

      {/* Recent Exams */}
      <Card>
        <CardHeader>
          <CardTitle>Your Exams</CardTitle>
          <CardDescription>
            Manage and monitor your examinations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exams.map((exam) => (
              <div key={exam.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-lg">{exam.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                        {exam.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{exam.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{exam.duration} minutes</span>
                      </div>
                      <div>Start: {formatDate(exam.startTime)}</div>
                      <div>End: {formatDate(exam.endTime)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/teacher/exam/${exam.id}`)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/teacher/exam/${exam.id}/monitor`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Monitor
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/teacher/exam/${exam.id}/submissions`)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Results
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}