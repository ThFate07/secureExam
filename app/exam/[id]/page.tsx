"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useExamTimer, useAntiCheat, useWebcam, useExamSession } from "../../hooks/useExam";
import { sendMonitoringEvent } from "../../lib/monitoringChannel";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { 
  Clock, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Camera,
  Shield,
  Send
} from "lucide-react";
import { Exam, Question } from "../../types";

export default function ExamInterface() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [violations, setViolations] = useState<string[]>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Mock exam data - in real app, this would come from API
  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'student')) {
      router.push("/auth");
      return;
    }

    const mockQuestions: Question[] = [
      {
        id: "q1",
        type: "mcq",
        question: "What is the derivative of x²?",
        options: ["2x", "x", "2", "x²"],
        correctAnswer: 0,
        points: 5,
        order: 1,
      },
      {
        id: "q2",
        type: "mcq",
        question: "Which of the following is a prime number?",
        options: ["4", "6", "7", "9"],
        correctAnswer: 2,
        points: 5,
        order: 2,
      },
      {
        id: "q3",
        type: "mcq",
        question: "What is the value of π (pi) approximately?",
        options: ["3.14", "2.71", "1.41", "1.73"],
        correctAnswer: 0,
        points: 5,
        order: 3,
      },
      {
        id: "q4",
        type: "short-answer",
        question: "Explain the Pythagorean theorem in your own words.",
        points: 10,
        order: 4,
      },
      {
        id: "q5",
        type: "mcq",
        question: "What is 15% of 200?",
        options: ["25", "30", "35", "40"],
        correctAnswer: 1,
        points: 5,
        order: 5,
      },
    ];

    const mockExam: Exam = {
      id: id as string,
      title: "Mathematics Final Exam",
      description: "Comprehensive mathematics assessment",
      teacherId: "teacher1",
      duration: 120, // 2 hours
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      maxAttempts: 1,
      questions: mockQuestions,
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
      createdAt: new Date(),
    };

    setExam(mockExam);
  }, [id, user, isAuthenticated, loading, router]);

  const handleViolation = (violation: string) => {
    setViolations(prev => [...prev, `${new Date().toLocaleTimeString()}: ${violation}`]);
    if (exam && user) {
      // Very naive severity heuristic
      const sev: 'low' | 'medium' | 'high' = /copy|paste|dev tools|fullscreen/i.test(violation)
        ? 'high'
        : /blur|focus|tab/i.test(violation)
        ? 'medium'
        : 'low';
      sendMonitoringEvent({
        type: 'violation',
        payload: {
          studentId: user.id,
            examId: exam.id,
            description: violation,
            severity: sev,
            timestamp: Date.now(),
        },
      });
    }
  };

  const handleSubmitExam = (answers: Map<string, string | number>) => {
    console.log("Submitting exam with answers:", answers);
    // In real app, this would submit to backend
    router.push("/dashboard/student");
  };

  const handleTimeUp = () => {
    examSessionData.submitExam();
  };

  // Initialize hooks
  const timer = useExamTimer({
    initialTime: exam ? exam.duration * 60 : 0,
    onTimeUp: handleTimeUp,
    isActive: !!exam,
  });

  // Initialize anti-cheat monitoring (runs for side effects)
  useAntiCheat({
    onViolation: handleViolation,
    enabled: exam?.settings.preventTabSwitching || false,
  });

  const webcam = useWebcam({
    enabled: exam?.settings.requireWebcam || false,
    onError: (error) => handleViolation(`Webcam error: ${error}`),
  });

  const examSessionData = useExamSession({
    examId: id as string,
    questions: exam?.questions || [],
    onSubmit: handleSubmitExam,
  });

  // Broadcast question changes
  useEffect(() => {
    if (!exam || !user) return;
    sendMonitoringEvent({
      type: 'question',
      payload: {
        studentId: user.id,
        examId: exam.id,
        questionIndex: examSessionData.currentQuestionIndex,
        timestamp: Date.now(),
      },
    });
  }, [examSessionData.currentQuestionIndex, exam, user]);

  // Heartbeat (activity ping)
  useEffect(() => {
    if (!exam || !user) return;
    const interval = setInterval(() => {
      sendMonitoringEvent({
        type: 'heartbeat',
        payload: {
          studentId: user.id,
          examId: exam.id,
          questionIndex: examSessionData.currentQuestionIndex,
          webcamActive: webcam.isActive,
          timestamp: Date.now(),
        },
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [exam, user, examSessionData.currentQuestionIndex, webcam.isActive]);

  // Webcam status change
  useEffect(() => {
    if (!exam || !user) return;
    sendMonitoringEvent({
      type: 'webcam',
      payload: {
        studentId: user.id,
        examId: exam.id,
        webcamActive: webcam.isActive,
        timestamp: Date.now(),
      },
    });
  }, [webcam.isActive, exam, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'student' || !exam) {
    return null;
  }

  const progress = examSessionData.getProgress();
  const currentQuestion = examSessionData.currentQuestion;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
              <p className="text-sm text-gray-700">
                Question {examSessionData.currentQuestionIndex + 1} of {exam.questions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Timer */}
              <div className="flex items-center space-x-2">
                <Clock className={`h-5 w-5 ${timer.timeRemaining < 300 ? 'text-red-600' : 'text-blue-600'}`} />
                <span className={`font-mono text-lg ${timer.timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'}`}>
                  {timer.formattedTime}
                </span>
              </div>

              {/* Progress */}
              <div className="text-sm text-gray-700">
                Progress: {progress.answered}/{progress.total} ({progress.percentage.toFixed(0)}%)
              </div>

              {/* Submit Button */}
              <Button
                onClick={() => setShowSubmitConfirm(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Exam
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Question {examSessionData.currentQuestionIndex + 1}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">{currentQuestion?.points} points</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => examSessionData.toggleFlag(currentQuestion?.id || "")}
                      className={examSessionData.flaggedQuestions.has(currentQuestion?.id || "") ? "bg-yellow-100" : ""}
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentQuestion && (
                  <>
                    <div className="text-lg">{currentQuestion.question}</div>
                    
                    {currentQuestion.type === "mcq" && currentQuestion.options && (
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => (
                          <label key={index} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="radio"
                              name={`question-${currentQuestion.id}`}
                              value={index}
                              checked={examSessionData.answers.get(currentQuestion.id) === index}
                              onChange={(e) => examSessionData.updateAnswer(currentQuestion.id, parseInt(e.target.value))}
                              className="h-4 w-4 text-blue-600"
                            />
                            <span className="text-gray-900">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {currentQuestion.type === "short-answer" && (
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={6}
                        placeholder="Enter your answer here..."
                        value={examSessionData.answers.get(currentQuestion.id) || ""}
                        onChange={(e) => examSessionData.updateAnswer(currentQuestion.id, e.target.value)}
                      />
                    )}
                  </>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={examSessionData.goToPrevious}
                    disabled={!examSessionData.canGoPrevious}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <span className="text-sm text-gray-500">
                    {examSessionData.currentQuestionIndex + 1} of {exam.questions.length}
                  </span>

                  <Button
                    onClick={examSessionData.goToNext}
                    disabled={!examSessionData.canGoNext}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Question Navigator */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {exam.questions.map((question, index) => (
                    <button
                      key={question.id}
                      onClick={() => examSessionData.goToQuestion(index)}
                      className={`
                        w-8 h-8 rounded text-sm font-medium border transition-colors
                        ${index === examSessionData.currentQuestionIndex 
                          ? "bg-blue-600 text-white border-blue-600" 
                          : examSessionData.answers.has(question.id)
                          ? "bg-green-100 text-green-800 border-green-300"
                          : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                        }
                        ${examSessionData.flaggedQuestions.has(question.id) ? "ring-2 ring-yellow-400" : ""}
                      `}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-600 rounded"></div>
                    <span>Current</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                    <span>Not answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-white border-2 border-yellow-400 rounded"></div>
                    <span>Flagged</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Webcam Monitor */}
            {exam.settings.requireWebcam && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Camera className="h-5 w-5" />
                    <span>Camera</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {webcam.isActive && webcam.stream ? (
                    <video
                      autoPlay
                      muted
                      className="w-full rounded border"
                      ref={(video) => {
                        if (video && webcam.stream) {
                          video.srcObject = webcam.stream;
                        }
                      }}
                    />
                  ) : (
                    <div className="aspect-video bg-gray-100 rounded border flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Camera className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Camera not active</p>
                      </div>
                    </div>
                  )}
                  {webcam.error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{webcam.error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Security Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Violations:</span>
                    <span className={violations.length > 0 ? "text-red-600" : "text-green-600"}>
                      {violations.length}
                    </span>
                  </div>
                  {violations.length > 0 && (
                    <div className="max-h-20 overflow-y-auto text-xs text-red-600">
                      {violations.slice(-3).map((violation, index) => (
                        <div key={index}>{violation}</div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Submit Exam</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to submit your exam? You have answered {progress.answered} out of {progress.total} questions.
            </p>
            <p className="text-sm text-red-600 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  examSessionData.submitExam();
                  setShowSubmitConfirm(false);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}