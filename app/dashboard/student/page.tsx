"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Clock,
  Calendar,
  CheckCircle,
  PlayCircle,
  AlertCircle,
  Trophy,
  Target,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import api from "../../lib/api/client";
import { ExamSettings } from "../../types";

type ExamStatusType = "draft" | "published" | "ongoing" | "completed" | "archived";
type AttemptStatusType = "in-progress" | "submitted" | "abandoned" | "terminated";

interface DashboardExam {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  duration: number;
  startTime: Date | null;
  endTime: Date | null;
  maxAttempts: number;
  settings: ExamSettings;
  status: ExamStatusType;
  createdAt: Date | null;
}

interface DashboardAttempt {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  startTime: Date | null;
  endTime: Date | null;
  score: number | null;
  status: AttemptStatusType;
}

interface DashboardStats {
  totalExams: number;
  completedExams: number;
  averageScore: number;
  upcomingExams: number;
}

interface ApiExam {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  duration: number;
  startTime: string | null;
  endTime: string | null;
  maxAttempts: number;
  settings?: Partial<ExamSettings> | null;
  status: ExamStatusType;
  createdAt: string;
}

interface ApiAttempt {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  startTime: string;
  endTime: string | null;
  score: number | null;
  status: AttemptStatusType;
}

interface StudentDashboardResponse {
  availableExams: ApiExam[];
  upcomingExams: ApiExam[];
  completedAttempts: ApiAttempt[];
  stats: DashboardStats;
}

const DEFAULT_STATS: DashboardStats = {
  totalExams: 0,
  completedExams: 0,
  averageScore: 0,
  upcomingExams: 0,
};

const DEFAULT_SETTINGS: ExamSettings = {
  shuffleQuestions: false,
  shuffleOptions: false,
  showResultsImmediately: false,
  allowReview: false,
  preventTabSwitching: false,
  requireWebcam: false,
  enableScreenMonitoring: false,
  lockdownBrowser: false,
};

const safeDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseExam = (exam: ApiExam): DashboardExam => {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(exam.settings ?? {}),
  } as ExamSettings;

  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    teacherId: exam.teacherId,
    duration: exam.duration,
    startTime: safeDate(exam.startTime),
    endTime: safeDate(exam.endTime),
    maxAttempts: exam.maxAttempts,
    settings,
    status: exam.status,
    createdAt: safeDate(exam.createdAt),
  };
};

const parseAttempt = (attempt: ApiAttempt): DashboardAttempt => ({
  id: attempt.id,
  examId: attempt.examId,
  examTitle: attempt.examTitle,
  studentId: attempt.studentId,
  startTime: safeDate(attempt.startTime),
  endTime: safeDate(attempt.endTime),
  score: typeof attempt.score === "number" ? attempt.score : null,
  status: attempt.status,
});

const formatDateTime = (date?: Date | null) => {
  if (!date || Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTimeUntilStart = (startTime?: Date | null) => {
  if (!startTime || Number.isNaN(startTime.getTime())) {
    return "Schedule not set";
  }

  const now = new Date();
  const diff = startTime.getTime() - now.getTime();

  if (diff <= 0) {
    return "Available now";
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Starts in ${days} day${days !== 1 ? "s" : ""}`;
  }

  if (hours > 0) {
    return `Starts in ${hours}h ${minutes}m`;
  }

  return `Starts in ${minutes}m`;
};

const canStartExam = (exam: DashboardExam) => {
  if (!["published", "ongoing"].includes(exam.status)) {
    return false;
  }

  const now = new Date();

  if (exam.startTime && now < exam.startTime) {
    return false;
  }

  if (exam.endTime && now > exam.endTime) {
    return false;
  }

  return true;
};

const getScoreLabel = (score: number | null) => {
  if (score === null || Number.isNaN(score)) {
    return "Pending grading";
  }

  return `${Math.round(score)}%`;
};

export default function StudentDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [availableExams, setAvailableExams] = useState<DashboardExam[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<DashboardExam[]>([]);
  const [completedAttempts, setCompletedAttempts] = useState<DashboardAttempt[]>([]);
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'student')) {
      router.push("/auth");
      return;
    }

    if (loading || !isAuthenticated || user?.role !== 'student') {
      return;
    }

    let isActive = true;

    const fetchDashboard = async () => {
      setIsFetching(true);
      setFetchError(null);

      try {
        const data = (await api.student.dashboard()) as StudentDashboardResponse;

        if (!isActive) {
          return;
        }

        setAvailableExams(data.availableExams.map(parseExam));
        setUpcomingExams(data.upcomingExams.map(parseExam));
        setCompletedAttempts(data.completedAttempts.map(parseAttempt));
        setStats({
          totalExams: data.stats?.totalExams ?? DEFAULT_STATS.totalExams,
          completedExams: data.stats?.completedExams ?? DEFAULT_STATS.completedExams,
          averageScore: data.stats?.averageScore ?? DEFAULT_STATS.averageScore,
          upcomingExams: data.stats?.upcomingExams ?? DEFAULT_STATS.upcomingExams,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error("Failed to load student dashboard data:", error);
        setFetchError(error instanceof Error ? error.message : "Failed to load dashboard data.");
        setAvailableExams([]);
        setUpcomingExams([]);
        setCompletedAttempts([]);
        setStats(DEFAULT_STATS);
      } finally {
        if (isActive) {
          setIsFetching(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      isActive = false;
    };
  }, [loading, isAuthenticated, user, router]);

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

  const showInitialLoading =
    isFetching &&
    availableExams.length === 0 &&
    upcomingExams.length === 0 &&
    completedAttempts.length === 0;

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

      {fetchError && (
        <Alert variant="destructive">
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {showInitialLoading && (
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center">
          <div className="flex items-center space-x-3 text-gray-600">
            <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading your dashboard...</span>
          </div>
        </div>
      )}

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
            <div className="text-2xl font-bold">{Number(stats.averageScore || 0).toFixed(0)}%</div>
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

      {availableExams.length === 0 && !showInitialLoading && !fetchError && (
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
            <p className="text-sm text-gray-600">
              No exams are currently available. Check back later or contact your instructor if you believe this is unexpected.
            </p>
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

      {upcomingExams.length === 0 && !showInitialLoading && !fetchError && (
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
            <p className="text-sm text-gray-600">
              No upcoming exams have been scheduled yet.
            </p>
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
                      <h3 className="font-semibold">{attempt.examTitle || "Exam Attempt"}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Completed: {formatDateTime(attempt.endTime ?? attempt.startTime)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{getScoreLabel(attempt.score)}</div>
                      <div className="text-sm text-gray-500">Score</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {completedAttempts.length === 0 && !showInitialLoading && !fetchError && (
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
            <p className="text-sm text-gray-600">You haven&apos;t completed any exams yet. Results will appear here once you do.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}