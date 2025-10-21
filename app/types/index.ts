export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  createdAt: Date;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  duration: number; // in minutes
  startTime: Date;
  endTime: Date;
  maxAttempts: number;
  questions: Question[];
  settings: ExamSettings;
  status: 'draft' | 'published' | 'ongoing' | 'completed';
  createdAt: Date;
}

export interface Question {
  id: string;
  type: 'mcq' | 'short-answer' | 'essay';
  question: string;
  options?: string[]; // for MCQ
  correctAnswer?: string | number; // for MCQ (index) or text
  points: number;
  order: number;
}

export interface ExamSettings {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  allowReview: boolean;
  preventTabSwitching: boolean;
  requireWebcam: boolean;
  enableScreenMonitoring: boolean;
  lockdownBrowser: boolean;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  startTime: Date;
  endTime?: Date;
  answers: ExamAnswer[];
  score?: number;
  status: 'in-progress' | 'submitted' | 'abandoned';
  flaggedActivities: FlaggedActivity[];
  webcamSnapshots: string[];
}

export interface ExamAnswer {
  questionId: string;
  answer: string | number;
  flaggedForReview: boolean;
  timeSpent: number; // in seconds
}

export interface FlaggedActivity {
  id: string;
  type: 'tab-switch' | 'window-blur' | 'copy-paste' | 'right-click' | 'fullscreen-exit' | 'suspicious-behavior';
  timestamp: Date;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface MonitoringData {
  studentId: string;
  examId: string;
  attemptId: string;
  isActive: boolean;
  lastActivity: Date;
  webcamEnabled: boolean;
  currentQuestion: number;
  flaggedActivities: FlaggedActivity[];
  warningsCount: number;
  isDemo?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface ExamSession {
  id: string;
  examId: string;
  studentId: string;
  startTime: Date;
  timeRemaining: number;
  currentQuestionIndex: number;
  answers: Map<string, string | number>;
  flaggedQuestions: Set<string>;
  isMonitored: boolean;
  webcamStream?: MediaStream;
}