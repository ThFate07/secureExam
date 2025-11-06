"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useExamTimer, useAntiCheat, useWebcam, useExamSession } from "../../hooks/useExam";
// Use WebSocket-based monitoring for cross-device real-time updates
import { 
  sendMonitoringEvent as sendWSMonitoringEvent,
  joinExamAsStudent,
  leaveExamAsStudent,
  subscribeTeacherMessages,
  subscribeExamTermination
} from "../../lib/monitoringWebSocket";
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
  Send,
  Ban
} from "lucide-react";
import { Exam } from "../../types";

export default function ExamInterface() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [violations, setViolations] = useState<string[]>([]);
  const [teacherMessages, setTeacherMessages] = useState<Array<{ message: string; timestamp: number }>>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [examTerminated, setExamTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");

  // Fetch exam data from API
  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'student')) {
      router.push("/auth");
      return;
    }

    if (isAuthenticated && user?.role === 'student' && id) {
      fetch(`/api/exams/${id}/start`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const { exam: examData, attemptId: startAttemptId } = data.data;
            const fetchedExam: Exam = {
              ...examData,
              startTime: data.data.exam.startTime ? new Date(data.data.exam.startTime) : new Date(),
              endTime: data.data.exam.endTime ? new Date(data.data.exam.endTime) : new Date(Date.now() + data.data.exam.duration * 60 * 1000),
              createdAt: new Date(data.data.exam.createdAt),
            };
            setExam(fetchedExam);
            setAttemptId(startAttemptId as string);
            
            // Check if the attempt is already terminated
            if (data.data.attempt?.status === 'TERMINATED') {
              setExamTerminated(true);
              setTerminationReason(data.data.terminationReason || 'Exam was terminated by the teacher');
            }
          } else {
            console.error('Failed to fetch exam:', data.error);
            alert(data.error?.message || 'Failed to load exam');
            router.push("/dashboard/student");
          }
        })
        .catch(error => {
          console.error('Failed to fetch exam:', error);
          alert('Failed to load exam');
          router.push("/dashboard/student");
        });
    }
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
      sendWSMonitoringEvent({
        type: 'violation',
        payload: {
          studentId: user.id,
            examId: exam.id,
            description: violation,
            severity: sev,
            timestamp: Date.now(),
        },
      });

      // Persist to API so violations survive reloads and teacher view keeps history
      const mapToEventType = (text: string):
        | 'TAB_SWITCH'
        | 'WINDOW_BLUR'
        | 'COPY_PASTE'
        | 'RIGHT_CLICK'
        | 'FULLSCREEN_EXIT'
        | 'WEBCAM_DISABLED'
        | 'SUSPICIOUS_BEHAVIOR' => {
        const t = text.toLowerCase();
        if (t.includes('tab')) return 'TAB_SWITCH';
        if (t.includes('blur') || t.includes('focus')) return 'WINDOW_BLUR';
        if (t.includes('copy') || t.includes('paste') || t.includes('cut')) return 'COPY_PASTE';
        if (t.includes('right-click') || t.includes('right click')) return 'RIGHT_CLICK';
        if (t.includes('fullscreen')) return 'FULLSCREEN_EXIT';
        if (t.includes('webcam')) return 'WEBCAM_DISABLED';
        return 'SUSPICIOUS_BEHAVIOR';
      };

      const sevApi = sev === 'high' ? 'HIGH' : sev === 'medium' ? 'MEDIUM' : 'LOW';
      try {
        fetch('/api/monitor/events?noCache=' + Date.now(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: exam.id,
            attemptId: attemptId || undefined,
            type: mapToEventType(violation),
            severity: sevApi,
            description: violation,
          }),
        }).catch(() => {/* ignore */});
      } catch {/* ignore */}
    }
  };

  const handleSubmitExam = async (answers: Map<string, string | number>) => {
    if (!exam) return;
    if (!attemptId) {
      console.error('No attemptId available for submission');
      alert('Unable to submit: attempt not initialized. Please refresh and try again.');
      return;
    }

    try {
      // Convert Map to array for API
      const answersArray = Array.from(answers.entries()).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const response = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: answersArray }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Exam submitted successfully! Score: ${data.data.percentage.toFixed(2)}%`);
        router.push("/dashboard/student");
      } else {
        console.error('Failed to submit exam:', data.error);
        alert(data.error?.message || 'Failed to submit exam');
      }
    } catch (error) {
      console.error('Failed to submit exam:', error);
      alert('Failed to submit exam');
    }
  };

  const handleTimeUp = () => {
    examSessionData.submitExam();
  };

  // Initialize hooks
  const endTimeMs = exam?.endTime.getTime();
  const remainingSeconds = useMemo(() => {
    return endTimeMs
      ? Math.max(0, Math.floor((endTimeMs - Date.now()) / 1000))
      : 0;
  }, [endTimeMs]);

  const timer = useExamTimer({
    initialTime: remainingSeconds,
    onTimeUp: handleTimeUp,
    isActive: !!exam,
  });

  // Initialize anti-cheat monitoring (runs for side effects)
  useAntiCheat({
    onViolation: handleViolation,
    config: {
      preventTabSwitching: exam?.settings.preventTabSwitching || false,
      lockdownBrowser: exam?.settings.lockdownBrowser || false,
      enableFullscreenMode: exam?.settings.enableFullscreenMode || false,
    },
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
    sendWSMonitoringEvent({
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
    console.log('[Exam] Starting heartbeat for student:', user.id, 'exam:', exam.id);
    const interval = setInterval(() => {
      const heartbeatEvent = {
        type: 'heartbeat' as const,
        payload: {
          studentId: user.id,
          examId: exam.id,
          questionIndex: examSessionData.currentQuestionIndex,
          webcamActive: webcam.isActive,
          timestamp: Date.now(),
        },
      };
      console.log('[Exam] Sending heartbeat:', heartbeatEvent);
      sendWSMonitoringEvent(heartbeatEvent);
    }, 5000);
    return () => {
      console.log('[Exam] Stopping heartbeat');
      clearInterval(interval);
    };
  }, [exam, user, examSessionData.currentQuestionIndex, webcam.isActive]);

  // Webcam status change
  useEffect(() => {
    if (!exam || !user) return;
    sendWSMonitoringEvent({
      type: 'webcam',
      payload: {
        studentId: user.id,
        examId: exam.id,
        webcamActive: webcam.isActive,
        timestamp: Date.now(),
      },
    });
  }, [webcam.isActive, exam, user]);

  // Restore persisted violations history for this attempt on reload
  useEffect(() => {
    if (!exam || !user) return;
    // Only fetch after attempt is initialized
    if (!attemptId) return;
    (async () => {
      try {
        const res = await fetch(`/api/monitor/events?examId=${exam.id}&attemptId=${attemptId}`);
        const data = await res.json();
        if (data?.success && Array.isArray(data.data?.events)) {
          const items: string[] = data.data.events
            .slice(0, 50)
            .map((e: { timestamp: string; description: string }) => `${new Date(e.timestamp).toLocaleTimeString()}: ${e.description}`);
          setViolations(items.reverse());
        }
      } catch {
        // best-effort only
      }
    })();
  }, [exam, user, attemptId]);

  // Join the monitoring room as a student once exam and user are available
  useEffect(() => {
    if (!exam || !user) return;
    console.log('[Exam] Joining exam monitoring room, studentId:', user.id, 'examId:', exam.id);
    joinExamAsStudent(user.id, exam.id);
    
    return () => {
      console.log('[Exam] Student leaving exam page');
      try {
        leaveExamAsStudent(user.id, exam.id);
      } catch {
        // noop
      }
    };
  }, [exam, user]);

  // Listen for messages from teacher targeted to this student
  useEffect(() => {
    if (!exam || !user) return;
    const unsubscribe = subscribeTeacherMessages((evt) => {
      // Prepend newest message
      setTeacherMessages((prev) => [{ message: evt.message, timestamp: evt.timestamp }, ...prev].slice(0, 20));
    });
    return () => unsubscribe();
  }, [exam, user]);

  // Listen for exam termination events
  useEffect(() => {
    if (!exam || !user) return;
    const unsubscribe = subscribeExamTermination((evt) => {
      if (evt.studentId === user.id && evt.examId === exam.id) {
        setExamTerminated(true);
        setTerminationReason(evt.reason || 'Exam was terminated by the teacher');
        
        // Immediately leave the exam monitoring
        try {
          leaveExamAsStudent(user.id, exam.id);
        } catch {
          // noop
        }
      }
    });
    return () => unsubscribe();
  }, [exam, user]);

  // Best-effort: notify server on page unload/refresh
  useEffect(() => {
    if (!exam || !user) return;
    const handler = () => {
      try {
        leaveExamAsStudent(user.id, exam.id);
      } catch {}
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [exam, user]);

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

  // Show termination screen if exam is terminated
  if (examTerminated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Card className="border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Ban className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-600">Exam Terminated</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-lg font-medium text-gray-900">{exam.title}</div>
              <div className="text-gray-600">
                Your exam has been terminated by the teacher and cannot be continued.
              </div>
              {terminationReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-medium text-red-800 mb-1">Reason:</div>
                  <div className="text-sm text-red-700">{terminationReason}</div>
                </div>
              )}
              <div className="pt-4">
                <Button 
                  onClick={() => router.push("/dashboard/student")}
                  className="w-full"
                >
                  Return to Dashboard
                </Button>
              </div>
              <div className="text-xs text-gray-500">
                If you believe this was done in error, please contact your teacher.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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

            {/* Teacher Messages */}
            {teacherMessages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Teacher Messages</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto text-sm">
                    {teacherMessages.slice(0, 5).map((m, idx) => (
                      <div key={idx} className="p-2 rounded border bg-blue-50 text-blue-900">
                        <div className="font-medium">{new Date(m.timestamp).toLocaleTimeString()}</div>
                        <div>{m.message}</div>
                      </div>
                    ))}
                  </div>
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