export interface Question {
  id: string;
  title: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[]; // For multiple choice and true/false
  correctAnswer: string | string[]; // Can be array for multiple correct answers
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  subject: string;
  tags: string[];
  explanation?: string;
  timeLimit?: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // teacher ID
}

export interface QuestionFilter {
  type?: string[];
  difficulty?: string[];
  subject?: string[];
  tags?: string[];
  createdBy?: string;
  search?: string;
}

export interface ExamQuestion extends Question {
  order: number;
  randomizeOptions?: boolean;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  instructions: string;
  questions: ExamQuestion[];
  duration: number; // in minutes
  totalPoints: number;
  passingScore: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  allowReview: boolean;
  showResults: boolean;
  startDate: Date;
  endDate: Date;
  attempts: number;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
  securitySettings: {
    lockBrowser: boolean;
    requireCamera: boolean;
    requireMicrophone: boolean;
    preventCopyPaste: boolean;
    preventRightClick: boolean;
    monitorTabSwitching: boolean;
    faceDetection: boolean;
    plagiarismCheck: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  enrolledStudents: string[];
}

export interface Student {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  studentId: string;
  phone?: string;
  enrolledClasses: string[];
  enrollmentDate: Date;
  status: 'active' | 'inactive' | 'suspended';
  academicStatus: 'regular' | 'probation' | 'honors' | 'dean-list';
  class: string;
  academicInfo: {
    gpa: number;
    totalCredits: number;
    completedCredits: number;
    semester: string;
    year: number;
    major: string;
    minor?: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
    email?: string;
  };
  profilePicture?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  lastLogin?: Date;
  updatedAt?: Date;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  studentId: string;
  answers: {
    questionId: string;
    answer: string | string[];
    timeSpent: number;
  }[];
  startTime: Date;
  endTime?: Date;
  score?: number;
  gradedScore?: number;
  status: 'in-progress' | 'submitted' | 'graded' | 'flagged';
  violations: {
    type: 'tab-switch' | 'copy-paste' | 'right-click' | 'face-not-detected' | 'multiple-faces' | 'suspicious-behavior';
    timestamp: Date;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  submittedAt?: Date;
  gradedAt?: Date;
  gradedBy?: string;
  feedback?: string;
}