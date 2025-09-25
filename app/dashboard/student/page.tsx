"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { 
  BookOpen, 
  Clock, 
  Calendar,
  CheckCircle,
  PlayCircle,
  AlertCircle,
  Trophy,
  Target
} from "lucide-react";
import { Exam, ExamAttempt } from "../../types";

export default function StudentDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [completedAttempts, setCompletedAttempts] = useState<ExamAttempt[]>([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    completedExams: 0,
    averageScore: 0,
    upcomingExams: 0,
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'student')) {
      router.push("/auth");
      return;
    }

    // Mock data for demonstration
    const mockAvailableExams: Exam[] = [
      {
        id: "1",
        title: "Mathematics Final Exam",
        description: "Comprehensive mathematics assessment covering algebra, geometry, and calculus",
        teacherId: "teacher1",
        duration: 120,
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
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
    ];

    const mockUpcomingExams: Exam[] = [
      {
        id: "2",
        title: "Physics Quiz - Chapter 5",
        description: "Quick assessment on electromagnetic waves and optics",
        teacherId: "teacher1",
        duration: 45,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
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
        status: "published",
        createdAt: new Date("2025-09-21"),
      },
    ];

    const mockCompletedAttempts: ExamAttempt[] = [
      {
        id: "attempt1",
        examId: "exam3",
        studentId: user?.id || "",
        startTime: new Date("2025-09-15T10:00:00"),
        endTime: new Date("2025-09-15T11:30:00"),
        answers: [],
        score: 85,
        status: "submitted",
        flaggedActivities: [],
        webcamSnapshots: [],
      },
      {
        id: "attempt2",
        examId: "exam4",
        studentId: user?.id || "",
        startTime: new Date("2025-09-18T14:00:00"),
        endTime: new Date("2025-09-18T14:45:00"),
        answers: [],
        score: 92,
        status: "submitted",
        flaggedActivities: [],
        webcamSnapshots: [],
      },
    ];

    setAvailableExams(mockAvailableExams);
    setUpcomingExams(mockUpcomingExams);
    setCompletedAttempts(mockCompletedAttempts);
    
    setStats({
      totalExams: mockAvailableExams.length + mockUpcomingExams.length + mockCompletedAttempts.length,
      completedExams: mockCompletedAttempts.length,
      averageScore: mockCompletedAttempts.reduce((acc, attempt) => acc + (attempt.score || 0), 0) / mockCompletedAttempts.length,
      upcomingExams: mockUpcomingExams.length,
    });
  }, [user, isAuthenticated, loading, router]);

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntilStart = (startTime: Date) => {
    const now = new Date();
    const diff = startTime.getTime() - now.getTime();
    
    if (diff <= 0) return "Available now";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days} day${days > 1 ? 's' : ''}`;
    }
    
    if (hours > 0) {
      return `Starts in ${hours}h ${minutes}m`;
    }
    
    return `Starts in ${minutes}m`;
  };

  const canStartExam = (exam: Exam) => {
    const now = new Date();
    return now >= exam.startTime && now <= exam.endTime;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'student') {
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
          View your available exams, track your progress, and check your results.
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
              Available to you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedExams}</div>
            <p className="text-xs text-muted-foreground">
              Exams finished
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              Across all exams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingExams}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled exams
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Available Exams */}
      {availableExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PlayCircle className="h-5 w-5 text-green-600" />
              <span>Available Exams</span>
            </CardTitle>
            <CardDescription>
              Exams you can take right now
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableExams.map((exam) => (
                <div key={exam.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{exam.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{exam.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{exam.duration} minutes</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Target className="h-4 w-4" />
                          <span>{exam.maxAttempts} attempt{exam.maxAttempts > 1 ? 's' : ''} allowed</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {formatDateTime(exam.endTime)}</span>
                        </div>
                      </div>
                      
                      {exam.settings.requireWebcam && (
                        <div className="flex items-center space-x-1 mt-2 text-sm text-orange-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>Webcam monitoring required</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <span className="text-sm font-medium text-green-600">
                        {getTimeUntilStart(exam.startTime)}
                      </span>
                      <Button
                        disabled={!canStartExam(exam)}
                        onClick={() => router.push(`/exam/${exam.id}/start`)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Start Exam
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Exams */}
      {upcomingExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Upcoming Exams</span>
            </CardTitle>
            <CardDescription>
              Exams scheduled for later
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{exam.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{exam.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{exam.duration} minutes</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Starts: {formatDateTime(exam.startTime)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-sm font-medium text-blue-600">
                        {getTimeUntilStart(exam.startTime)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Results */}
      {completedAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <span>Recent Results</span>
            </CardTitle>
            <CardDescription>
              Your latest exam performances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedAttempts.map((attempt) => (
                <div key={attempt.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">Exam Attempt</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Completed: {formatDateTime(attempt.endTime!)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {attempt.score}%
                      </div>
                      <div className="text-sm text-gray-500">Score</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}