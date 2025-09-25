// DEMO DATA MODULE
// This file contains in-memory demo data used when running the app without a backend.
// It gets normalized into localStorage via examStore.ts seedIfEmpty().
// Add or adjust objects here to instantly change what appears in demo mode.

export const demoUsers = [
  {
    id: "demo_teacher_456",
    name: "Dr. Sarah Wilson",
    email: "teacher@demo.com",
    role: "teacher" as const,
    createdAt: new Date("2024-09-10"),
  },
  {
    id: "demo_student_123",
    name: "Alex Johnson",
    email: "student@demo.com",
    role: "student" as const,
    createdAt: new Date("2024-09-11"),
  },
  {
    id: "demo_student_789",
    name: "Priya Patel",
    email: "priya@student.demo",
    role: "student" as const,
    createdAt: new Date("2024-09-12"),
  },
  {
    id: "demo_student_321",
    name: "Liam Chen",
    email: "liam@student.demo",
    role: "student" as const,
    createdAt: new Date("2024-09-12"),
  }
];

export const demoExams = [
  {
    id: "exam_1",
    title: "JavaScript Fundamentals Quiz",
    description: "Test your knowledge of JavaScript basics including variables, functions, and data types.",
    duration: 30, // minutes
    totalQuestions: 10,
    status: "active" as const,
    createdBy: "demo_teacher_456",
    createdAt: new Date("2024-09-15"),
    questions: [
      {
        id: "q1",
        question: "Which of the following is used to declare a variable in JavaScript?",
        options: ["var", "let", "const", "All of the above"],
        correctAnswer: 3,
        points: 1
      },
      {
        id: "q2", 
        question: "What does the '===' operator do in JavaScript?",
        options: ["Assignment", "Equality comparison", "Strict equality comparison", "Not equal"],
        correctAnswer: 2,
        points: 1
      },
      {
        id: "q3",
        question: "Which method is used to add an element to the end of an array?",
        options: ["push()", "pop()", "shift()", "unshift()"],
        correctAnswer: 0,
        points: 1
      },
      {
        id: "q4",
        question: "What is the correct way to create a function in JavaScript?",
        options: ["function myFunction() {}", "create myFunction() {}", "def myFunction() {}", "func myFunction() {}"],
        correctAnswer: 0,
        points: 1
      },
      {
        id: "q5",
        question: "Which of the following is NOT a JavaScript data type?",
        options: ["String", "Boolean", "Integer", "Object"],
        correctAnswer: 2,
        points: 1
      },
      {
        id: "q6",
        question: "How do you write a comment in JavaScript?",
        options: ["<!-- comment -->", "// comment", "# comment", "/* comment */"],
        correctAnswer: 1,
        points: 1
      },
      {
        id: "q7",
        question: "What will 'typeof null' return in JavaScript?",
        options: ["null", "undefined", "object", "boolean"],
        correctAnswer: 2,
        points: 1
      },
      {
        id: "q8",
        question: "Which method converts a string to lowercase?",
        options: ["toLowerCase()", "toLower()", "lower()", "downCase()"],
        correctAnswer: 0,
        points: 1
      },
      {
        id: "q9",
        question: "What does the 'length' property return for arrays?",
        options: ["The last index", "The number of elements", "The first element", "The array type"],
        correctAnswer: 1,
        points: 1
      },
      {
        id: "q10",
        question: "How do you access the first element of an array named 'arr'?",
        options: ["arr[1]", "arr[0]", "arr.first()", "arr.get(0)"],
        correctAnswer: 1,
        points: 1
      }
    ]
  },
  {
    id: "exam_2", 
    title: "React Components & Hooks",
    description: "Advanced quiz on React components, hooks, and state management.",
    duration: 45,
    totalQuestions: 8,
    status: "active" as const,
    createdBy: "demo_teacher_456",
    createdAt: new Date("2024-09-18"),
    questions: [
      {
        id: "q1",
        question: "Which hook is used for state management in functional components?",
        options: ["useEffect", "useState", "useContext", "useReducer"],
        correctAnswer: 1,
        points: 2
      },
      {
        id: "q2",
        question: "What is the purpose of useEffect hook?",
        options: ["State management", "Side effects", "Context creation", "Component styling"],
        correctAnswer: 1,
        points: 2
      },
      {
        id: "q3",
        question: "How do you pass data from parent to child component?",
        options: ["State", "Props", "Context", "Refs"],
        correctAnswer: 1,
        points: 2
      },
      {
        id: "q4",
        question: "What does JSX stand for?",
        options: ["JavaScript XML", "JavaScript Extension", "Java Syntax Extension", "JavaScript Syntax"],
        correctAnswer: 0,
        points: 1
      },
      {
        id: "q5",
        question: "Which method is called after a component is mounted?",
        options: ["componentDidMount", "componentWillMount", "componentDidUpdate", "componentWillUnmount"],
        correctAnswer: 0,
        points: 2
      },
      {
        id: "q6",
        question: "What is the virtual DOM?",
        options: ["A copy of the real DOM", "A JavaScript representation of the DOM", "A faster version of DOM", "All of the above"],
        correctAnswer: 3,
        points: 2
      },
      {
        id: "q7",
        question: "How do you handle events in React?",
        options: ["onClick={handleClick}", "onclick='handleClick()'", "onEvent={handleClick}", "@click={handleClick}"],
        correctAnswer: 0,
        points: 1
      },
      {
        id: "q8",
        question: "What is React.Fragment used for?",
        options: ["Creating components", "Grouping elements without extra DOM nodes", "Styling components", "Managing state"],
        correctAnswer: 1,
        points: 2
      }
    ]
  },
  {
    id: "exam_3",
    title: "Mathematics - Algebra Basics", 
    description: "Fundamental algebra concepts including equations, variables, and basic operations.",
    duration: 60,
    totalQuestions: 12,
    status: "active" as const,
    createdBy: "demo_teacher_456",
    createdAt: new Date("2024-09-20"),
    questions: [
      {
        id: "q1",
        question: "Solve for x: 2x + 5 = 15",
        options: ["x = 5", "x = 10", "x = 7.5", "x = 20"],
        correctAnswer: 0,
        points: 1
      },
      {
        id: "q2",
        question: "What is the value of x² when x = 4?",
        options: ["8", "12", "16", "20"],
        correctAnswer: 2,
        points: 1
      },
      {
        id: "q3",
        question: "Simplify: 3x + 2x - x",
        options: ["4x", "5x", "6x", "2x"],
        correctAnswer: 0,
        points: 1
      },
      {
        id: "q4",
        question: "If y = 3x + 2 and x = 4, what is y?",
        options: ["10", "12", "14", "16"],
        correctAnswer: 2,
        points: 1
      },
      {
        id: "q5",
        question: "Factor: x² - 4",
        options: ["(x-2)(x-2)", "(x+2)(x+2)", "(x-2)(x+2)", "Cannot be factored"],
        correctAnswer: 2,
        points: 2
      },
      {
        id: "q6",
        question: "What is the slope of the line y = 2x + 3?",
        options: ["2", "3", "2x", "5"],
        correctAnswer: 0,
        points: 1
      },
      {
        id: "q7",
        question: "Solve: 3x - 7 = 2x + 5",
        options: ["x = 12", "x = 2", "x = -2", "x = 6"],
        correctAnswer: 0,
        points: 2
      },
      {
        id: "q8",
        question: "What is the y-intercept of y = -x + 4?",
        options: ["1", "-1", "4", "-4"],
        correctAnswer: 2,
        points: 1
      },
      {
        id: "q9",
        question: "Expand: (x + 3)(x + 2)",
        options: ["x² + 5x + 6", "x² + 6x + 5", "x² + 5x + 5", "x² + 6x + 6"],
        correctAnswer: 0,
        points: 2
      },
      {
        id: "q10",
        question: "If 2x + y = 10 and x = 3, what is y?",
        options: ["2", "4", "6", "8"],
        correctAnswer: 1,
        points: 1
      },
      {
        id: "q11",
        question: "Solve for x: x/3 + 2 = 5",
        options: ["x = 9", "x = 3", "x = 6", "x = 15"],
        correctAnswer: 0,
        points: 2
      },
      {
        id: "q12",
        question: "What is the value of |−8|?",
        options: ["-8", "8", "0", "16"],
        correctAnswer: 1,
        points: 1
      }
    ]
  }
];

export const demoStudentResults = [
  {
    examId: "exam_1",
    studentId: "demo_student_123",
    score: 8,
    totalQuestions: 10,
    percentage: 80,
    completedAt: new Date("2024-09-16"),
    timeSpent: 25, // minutes
    answers: [
      { questionId: "q1", selectedAnswer: 3, isCorrect: true },
      { questionId: "q2", selectedAnswer: 2, isCorrect: true },
      { questionId: "q3", selectedAnswer: 0, isCorrect: true },
      { questionId: "q4", selectedAnswer: 0, isCorrect: true },
      { questionId: "q5", selectedAnswer: 1, isCorrect: false },
      { questionId: "q6", selectedAnswer: 1, isCorrect: true },
      { questionId: "q7", selectedAnswer: 2, isCorrect: true },
      { questionId: "q8", selectedAnswer: 0, isCorrect: true },
      { questionId: "q9", selectedAnswer: 0, isCorrect: false },
      { questionId: "q10", selectedAnswer: 1, isCorrect: true }
    ]
  }
];

// Example submissions (attempt summaries) for monitoring and results pages
export const demoSubmissions = [
  {
    id: "sub_1",
    examId: "exam_1",
    studentId: "demo_student_123",
    startedAt: new Date("2024-09-16T10:00:00Z"),
    submittedAt: new Date("2024-09-16T10:25:00Z"),
    score: 8,
    total: 10,
    percentage: 80,
    flaggedActivities: 2,
    webcamSnapshots: 3,
  },
  {
    id: "sub_2",
    examId: "exam_1",
    studentId: "demo_student_789",
    startedAt: new Date("2024-09-16T10:05:00Z"),
    submittedAt: new Date("2024-09-16T10:31:00Z"),
    score: 9,
    total: 10,
    percentage: 90,
    flaggedActivities: 0,
    webcamSnapshots: 4,
  },
  {
    id: "sub_3",
    examId: "exam_2",
    studentId: "demo_student_321",
    startedAt: new Date("2024-09-18T09:00:00Z"),
    submittedAt: new Date("2024-09-18T09:38:00Z"),
    score: 11,
    total: 16,
    percentage: 69,
    flaggedActivities: 1,
    webcamSnapshots: 0,
  }
];

// Lightweight synthetic monitoring events (recent) for teacher monitor demo
export const demoMonitoringEvents = [
  { type: 'heartbeat', payload: { studentId: 'demo_student_123', examId: 'exam_1', questionIndex: 2, webcamActive: true, timestamp: Date.now() - 15000 } },
  { type: 'question', payload: { studentId: 'demo_student_123', examId: 'exam_1', questionIndex: 3, timestamp: Date.now() - 12000 } },
  { type: 'violation', payload: { studentId: 'demo_student_789', examId: 'exam_1', description: 'Tab switch detected', severity: 'medium', timestamp: Date.now() - 11000 } },
  { type: 'heartbeat', payload: { studentId: 'demo_student_789', examId: 'exam_1', questionIndex: 4, webcamActive: true, timestamp: Date.now() - 8000 } },
  { type: 'webcam', payload: { studentId: 'demo_student_321', examId: 'exam_2', webcamActive: false, timestamp: Date.now() - 6000 } },
];

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function getDemoExamsForRole(role: 'student' | 'teacher') {
  if (role === 'teacher') {
    return demoExams;
  } else {
    // For students, return exams with limited info (no correct answers)
    return demoExams.map(exam => ({
      ...exam,
      questions: exam.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        points: q.points
        // Remove correctAnswer for students
      }))
    }));
  }
}

export function getDemoStudentResults(studentId: string) {
  return demoStudentResults.filter(result => result.studentId === studentId);
}

export function getDemoSubmissionsByExam(examId: string) {
  return demoSubmissions.filter(s => s.examId === examId);
}

export function getDemoUser(id: string) {
  return demoUsers.find(u => u.id === id);
}

export function listDemoStudents() {
  return demoUsers.filter(u => u.role === 'student');
}

type DemoMonitoringEvent = typeof demoMonitoringEvents[number];
export function listDemoMonitoringEvents(examId?: string) {
  return demoMonitoringEvents.filter((e: DemoMonitoringEvent) => !examId || e.payload.examId === examId);
}