"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useExamTimer, useAntiCheat, useWebcam, useExamSession } from "../../hooks/useExam";
import { useFaceDetection } from "../../hooks/useFaceDetection";
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
  Ban,
  Activity
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
  const [isTerminated, setIsTerminated] = useState(false); // Violation-based termination
  const [examTerminated, setExamTerminated] = useState(false); // Teacher-initiated termination
  const [terminationReason, setTerminationReason] = useState("");
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  
  // Track violations by type with debouncing and count
  const violationTimestamps = useRef<Map<string, number>>(new Map());
  const intentionalViolationCounts = useRef<Map<string, number>>(new Map()); // Only intentional violations count
  const lastViolationSent = useRef<Map<string, number>>(new Map());
  const violationDebounceMs = 5000; // Don't send duplicate violations within 5 seconds
  
  // Get violation limit from exam settings, default to 3
  const maxViolationsBeforeTermination = (exam?.settings as { maxIntentionalViolations?: number } | undefined)?.maxIntentionalViolations || 3;

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
            const { exam: examData, attemptId: startAttemptId, savedAnswers, startTime } = data.data;
            
            // Calculate end time based on actual start time and duration
            const actualStartTime = startTime ? new Date(startTime) : new Date();
            const examDurationMs = examData.duration * 60 * 1000;
            const calculatedEndTime = new Date(actualStartTime.getTime() + examDurationMs);
            
            const fetchedExam: Exam = {
              ...examData,
              startTime: actualStartTime,
              endTime: examData.endTime ? new Date(examData.endTime) : calculatedEndTime,
              createdAt: new Date(examData.createdAt),
            };
            setExam(fetchedExam);
            setAttemptId(startAttemptId as string);
            
            // Restore saved answers if available (for page refresh)
            if (savedAnswers && Object.keys(savedAnswers).length > 0) {
              // Store saved answers to restore in examSessionData after it's initialized
              (window as any).__restoreAnswers = savedAnswers;
            }
            
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

  const mapToEventType = (text: string):
    | 'TAB_SWITCH'
    | 'WINDOW_BLUR'
    | 'COPY_PASTE'
    | 'RIGHT_CLICK'
    | 'FULLSCREEN_EXIT'
    | 'WEBCAM_DISABLED'
    | 'SUSPICIOUS_BEHAVIOR'
    | 'NETWORK_ISSUE' => {
    const t = text.toLowerCase();
    if (t.includes('tab')) return 'TAB_SWITCH';
    if (t.includes('blur') || t.includes('focus')) return 'WINDOW_BLUR';
    if (t.includes('copy') || t.includes('paste') || t.includes('cut')) return 'COPY_PASTE';
    if (t.includes('right-click') || t.includes('right click')) return 'RIGHT_CLICK';
    if (t.includes('fullscreen')) return 'FULLSCREEN_EXIT';
    if (t.includes('webcam')) return 'WEBCAM_DISABLED';
    if (t.includes('network') || t.includes('connection')) return 'NETWORK_ISSUE';
    return 'SUSPICIOUS_BEHAVIOR';
  };

  // Categorize violation as intentional or technical
  const isIntentionalViolation = (violation: string, eventType: string): boolean => {
    const lowerViolation = violation.toLowerCase();
    const lowerEventType = eventType.toLowerCase();
    
    // Technical issues (not counted toward termination)
    if (
      lowerEventType === 'network_issue' ||
      lowerViolation.includes('network') ||
      lowerViolation.includes('connection') ||
      lowerViolation.includes('timeout') ||
      (lowerEventType === 'webcam_disabled' && (
        lowerViolation.includes('permission') ||
        lowerViolation.includes('hardware') ||
        lowerViolation.includes('device not found') ||
        lowerViolation.includes('failed to access')
      ))
    ) {
      return false; // Technical issue
    }
    
    // Intentional violations (counted toward termination)
    if (
      lowerEventType === 'copy_paste' ||
      lowerEventType === 'right_click' ||
      lowerViolation.includes('developer tools') ||
      lowerViolation.includes('dev tools') ||
      lowerViolation.includes('f12') ||
      lowerViolation.includes('copy/paste') ||
      lowerViolation.includes('copy/paste/cut attempted') ||
      lowerViolation.includes('alt+tab') ||
      lowerViolation.includes('print attempt')
    ) {
      return true; // Definitely intentional
    }
    
    // Context-dependent: tab switching and fullscreen
    // Single occurrences might be accidental, but patterns indicate intentional behavior
    if (lowerEventType === 'tab_switch' || lowerEventType === 'window_blur') {
      // If multiple tab switches in quick succession, it's intentional
      const lastTabSwitch = violationTimestamps.current.get(eventType) || 0;
      const timeSinceLast = Date.now() - lastTabSwitch;
      // If tab switch happened within 30 seconds of last one, likely intentional pattern
      // Single accidental tab switch is lenient
      if (timeSinceLast < 30000) {
        const existingCount = intentionalViolationCounts.current.get(eventType) || 0;
        // Second tab switch within 30s = intentional, first one gets benefit of doubt
        return existingCount >= 1;
      }
      // First occurrence gets benefit of doubt (accidental)
      return false;
    }
    
    if (lowerEventType === 'fullscreen_exit') {
      // If user pressed ESC or clicked exit button, it's intentional
      // But if browser/system forced exit (e.g., OS notification), it's technical
      return !lowerViolation.includes('browser') && !lowerViolation.includes('system') && !lowerViolation.includes('auto');
    }
    
    // Default: treat as intentional if context suggests it
    return true;
  };

  const handleViolation = (violation: string) => {
    if (isTerminated || examTerminated) return; // Ignore violations if exam is already terminated

    const eventType = mapToEventType(violation);
    const isIntentional = isIntentionalViolation(violation, eventType);
    const now = Date.now();
    const lastSent = lastViolationSent.current.get(eventType) || 0;
    const timeSinceLastSent = now - lastSent;

    // Debounce: Skip if same violation type was sent recently
    if (timeSinceLastSent < violationDebounceMs) {
      // Only count intentional violations
      if (isIntentional) {
        const newCount = (intentionalViolationCounts.current.get(eventType) || 0) + 1;
        intentionalViolationCounts.current.set(eventType, newCount);
        
        // Check termination even for debounced violations
        if (newCount >= maxViolationsBeforeTermination && !isTerminated) {
          setIsTerminated(true);
          const eventTypeName = eventType.replace(/_/g, ' ').toLowerCase();
          alert(`Exam terminated due to ${maxViolationsBeforeTermination} intentional ${eventTypeName} violations. Your exam will be automatically submitted.`);
          setTimeout(() => {
            if (examSessionDataRef.current && !examSessionDataRef.current.isSubmitted) {
              examSessionDataRef.current.submitExam();
            }
          }, 1000);
        }
      }
      return;
    }

    // Update violation count - only for intentional violations
    let currentCount = intentionalViolationCounts.current.get(eventType) || 0;
    if (isIntentional) {
      currentCount += 1;
      intentionalViolationCounts.current.set(eventType, currentCount);
    }
    violationTimestamps.current.set(eventType, now);
    lastViolationSent.current.set(eventType, now);

    // Update UI violations list (limit to last 50 to prevent memory issues)
    const violationLabel = isIntentional 
      ? `${violation} [Intentional: ${currentCount}/${maxViolationsBeforeTermination}]`
      : `${violation} [Technical Issue - Not Counted]`;
    
    setViolations(prev => {
      const newViolation = `${new Date().toLocaleTimeString()}: ${violationLabel}`;
      return [...prev, newViolation].slice(-50);
    });

    if (exam && user) {
      // Very naive severity heuristic
      const sev: 'low' | 'medium' | 'high' = /copy|paste|dev tools|fullscreen/i.test(violation)
        ? 'high'
        : /blur|focus|tab/i.test(violation)
        ? 'medium'
        : 'low';
      
      // Adjust severity based on intentional vs technical
      const adjustedSev = isIntentional ? sev : 'low';
      const sevApi = adjustedSev === 'high' ? 'HIGH' : adjustedSev === 'medium' ? 'MEDIUM' : 'LOW';
      
      sendWSMonitoringEvent({
        type: 'violation',
        payload: {
          studentId: user.id,
          examId: exam.id,
          description: isIntentional 
            ? `${violation} [Intentional Violation ${currentCount} of ${maxViolationsBeforeTermination}]`
            : `${violation} [Technical Issue - Not Counted]`,
          severity: adjustedSev,
          timestamp: now,
        },
      });
      
      // Send to API (throttled by rate limiter, but we debounced on our end)
      fetch('/api/monitor/events?noCache=' + now, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: exam.id,
          attemptId: attemptId || undefined,
          type: eventType,
          severity: sevApi,
          description: isIntentional 
            ? `${violation} [Intentional Violation ${currentCount} of ${maxViolationsBeforeTermination}]`
            : `${violation} [Technical Issue - Not Counted]`,
          metadata: {
            isIntentional,
            violationCategory: isIntentional ? 'intentional' : 'technical',
          },
        }),
      }).catch(() => {/* ignore */});

      // Check if we've reached the threshold - only for intentional violations
      if (isIntentional && currentCount >= maxViolationsBeforeTermination && !isTerminated) {
        setIsTerminated(true);
        const eventTypeName = eventType.replace(/_/g, ' ').toLowerCase();
        alert(`Exam terminated due to ${maxViolationsBeforeTermination} intentional ${eventTypeName} violations. Your exam will be automatically submitted.`);
        
        // Automatically submit the exam with current answers
        setTimeout(() => {
          if (examSessionDataRef.current && !examSessionDataRef.current.isSubmitted) {
            examSessionDataRef.current.submitExam();
          }
        }, 1000);
      }
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

  // Face detection for suspicious behavior
  const faceDetection = useFaceDetection({
    enabled: exam?.settings.requireWebcam || false,
    videoElement: videoElementRef.current || undefined,
    onViolation: (type, description) => {
      // Map face detection violations to violation handler
      handleViolation(`Face detection: ${description}`);
      
      // Send monitoring event
      if (exam && attemptId && user) {
        const severity = type === 'FACE_CHANGED' || type === 'MULTIPLE_FACES' ? 'HIGH' : 'MEDIUM';
        sendWSMonitoringEvent({
          examId: exam.id,
          attemptId,
          type: type as any,
          severity: severity as any,
          description,
        }).catch(() => {
          // Fallback to HTTP API if WebSocket fails
          fetch('/api/monitor/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              examId: exam.id,
              attemptId,
              type: type as any,
              severity: severity as any,
              description,
            }),
          }).catch(() => {});
        });
      }
    },
  });

  const examSessionData = useExamSession({
    examId: id as string,
    questions: exam?.questions || [],
    onSubmit: handleSubmitExam,
    attemptId: attemptId || undefined,
  });

  // Restore saved answers on mount/refresh
  const restoreAnswersAttempted = useRef(false);
  useEffect(() => {
    if (!exam || !attemptId || restoreAnswersAttempted.current) return;
    restoreAnswersAttempted.current = true;
    
    // Check if we have saved answers to restore
    const restoreAnswers = async () => {
      try {
        const response = await fetch(`/api/attempts/${attemptId}/answers`);
        if (!response.ok) {
          // Server returned an error, don't retry
          return;
        }
        const data = await response.json();
        
        if (data.success && data.data.answers) {
          const savedAnswers = data.data.answers;
          // Restore answers to examSessionData
          for (const [questionId, answerData] of Object.entries(savedAnswers)) {
            const answerInfo = answerData as { answer: string | number; flaggedForReview: boolean };
            examSessionData.updateAnswer(questionId, answerInfo.answer);
            if (answerInfo.flaggedForReview) {
              examSessionData.toggleFlag(questionId);
            }
          }
        }
      } catch (error) {
        // Only log if it's not a connection error (server not running)
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          // Server is not running or connection refused - silent fail
          return;
        }
        console.error('Failed to restore saved answers:', error);
        // Non-fatal - continue without restoration
      }
    };
    
    restoreAnswers();
  }, [exam, attemptId, examSessionData]);

  // Auto-save answers as student types (debounced)
  const saveAnswerTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const previousAnswersRef = useRef<Map<string, string | number>>(new Map());
  
  const autoSaveAnswer = useCallback(async (questionId: string, answer: string | number) => {
    if (!attemptId) return;
    
    // Clear existing timeout for this question
    const existingTimeout = saveAnswerTimeoutRef.current.get(questionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout to save after 2 seconds of no changes
    const timeout = setTimeout(async () => {
      try {
        await fetch(`/api/attempts/${attemptId}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId,
            answer,
            flaggedForReview: examSessionData.flaggedQuestions.has(questionId),
          }),
        });
      } catch (error) {
        console.error('Failed to auto-save answer:', error);
        // Non-fatal - continue
      } finally {
        saveAnswerTimeoutRef.current.delete(questionId);
      }
    }, 2000);
    
    saveAnswerTimeoutRef.current.set(questionId, timeout);
  }, [attemptId, examSessionData.flaggedQuestions]);

  // Monitor answer changes and auto-save
  useEffect(() => {
    if (!exam || !attemptId) return;
    
    const currentAnswers = examSessionData.answers;
    
    // Check for new or changed answers
    currentAnswers.forEach((answer, questionId) => {
      const previousAnswer = previousAnswersRef.current.get(questionId);
      if (previousAnswer !== answer) {
        autoSaveAnswer(questionId, answer);
      }
    });
    
    // Update previous answers ref
    previousAnswersRef.current = new Map(currentAnswers);
    
    // Cleanup timeouts on unmount
    return () => {
      saveAnswerTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      saveAnswerTimeoutRef.current.clear();
    };
  }, [examSessionData.answers, exam, attemptId, autoSaveAnswer]);

  // Store examSessionData ref for violation handler
  const examSessionDataRef = useRef(examSessionData);
  useEffect(() => {
    examSessionDataRef.current = examSessionData;
  }, [examSessionData]);

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
  // Heartbeat (activity ping)
  // Use refs for frequently changing values so the interval isn't restarted
  // every time the current question or webcam status changes.
  const currentQuestionIndexRef = useRef(examSessionData.currentQuestionIndex);
  useEffect(() => {
    currentQuestionIndexRef.current = examSessionData.currentQuestionIndex;
  }, [examSessionData.currentQuestionIndex]);

  const webcamActiveRef = useRef(webcam.isActive);
  useEffect(() => {
    webcamActiveRef.current = webcam.isActive;
  }, [webcam.isActive]);

  useEffect(() => {
    if (!exam || !user) return;
    console.log('[Exam] Starting heartbeat for student:', user.id, 'exam:', exam.id);
    const interval = setInterval(() => {
      const heartbeatEvent = {
        type: 'heartbeat' as const,
        payload: {
          studentId: user.id,
          examId: exam.id,
          questionIndex: currentQuestionIndexRef.current,
          webcamActive: webcamActiveRef.current,
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
  }, [exam, user]);

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

  // Periodically capture and upload webcam snapshots while webcam is active.
  useEffect(() => {
    if (!exam || !user) return;
    if (!attemptId) return; // need attempt to attribute snapshot

    let stopped = false;
    let uploading = false;

    const uploadSnapshot = async () => {
      if (stopped || uploading) return;
      if (!webcam.isActive) return;
      uploading = true;
      try {
        const dataUrl = await webcam.captureSnapshot();
        if (!dataUrl) return;

        // POST JSON payload expected by the API route
        const res = await fetch('/api/media/snapshots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId, image: dataUrl, type: 'WEBCAM' }),
          credentials: 'include',
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          handleViolation(`Snapshot upload failed: ${res.status} ${res.statusText} ${text}`);
        }
      } catch (err: any) {
        handleViolation(`Snapshot upload error: ${err?.message || String(err)}`);
      } finally {
        uploading = false;
      }
    };

    // Take an immediate snapshot, then every 15s while active
    const immediate = setTimeout(() => uploadSnapshot(), 1000);
    const interval = setInterval(() => uploadSnapshot(), 15_000);

    return () => {
      stopped = true;
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, [webcam, attemptId, exam, user]);

  // Restore persisted violations history for this attempt on reload
  // Only show actual violations, not system events like EXAM_STARTED, EXAM_PAUSED, etc.
  useEffect(() => {
    if (!exam || !user) return;
    // Only fetch after attempt is initialized
    if (!attemptId) return;
    (async () => {
      try {
        const res = await fetch(`/api/monitor/events?examId=${exam.id}&attemptId=${attemptId}`);
        const data = await res.json();
        if (data?.success && Array.isArray(data.data?.events)) {
          // Filter out non-violation events - only show actual security violations
          const violationEventTypes = [
            'TAB_SWITCH', 'WINDOW_BLUR', 'COPY_PASTE', 'RIGHT_CLICK',
            'FULLSCREEN_EXIT', 'SUSPICIOUS_BEHAVIOR', 'WEBCAM_DISABLED',
            'MULTIPLE_FACES', 'NO_FACE_DETECTED', 'FACE_CHANGED',
            'UNAUTHORIZED_DEVICE', 'NETWORK_ISSUE'
          ];
          
          const violationEvents = data.data.events.filter(
            (e: { type: string }) => violationEventTypes.includes(e.type)
          );
          
          const items: string[] = violationEvents
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

  // Warn on page refresh and log as violation
  useEffect(() => {
    if (!exam || !user || examTerminated || isTerminated) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn user about refresh
      e.preventDefault();
      e.returnValue = 'Refreshing the page during an exam may result in violations. Your progress is saved, but refreshing is not recommended.';
      
      // Log refresh attempt as violation
      handleViolation('Page refresh attempted - progress saved but refresh is not allowed');
      
      return e.returnValue;
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Also notify server on page unload/refresh
    const handler = () => {
      try {
        leaveExamAsStudent(user.id, exam.id);
      } catch {}
    };
    window.addEventListener('unload', handler);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handler);
    };
  }, [exam, user, examTerminated, isTerminated]);

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
      {/* Termination Alert */}
      {isTerminated && (
        <div className="bg-red-600 text-white p-4 text-center font-semibold sticky top-0 z-20">
          ⚠️ Exam Terminated - Your exam will be submitted automatically due to excessive violations
        </div>
      )}
      
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
                disabled={isTerminated || examTerminated}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {(isTerminated || examTerminated) ? 'Submitting...' : 'Submit Exam'}
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

                    {(() => {
                      const rawType = (currentQuestion as unknown as { type?: string }).type || "";
                      const normalized = rawType.toString().toLowerCase().replace(/\s+/g, "-");

                      // MCQ rendering (supports "mcq" or "mcq" in any casing)
                      if (normalized === "mcq") {
                        const opts = Array.isArray(currentQuestion.options) ? currentQuestion.options : [];
                        return (
                          <div className="space-y-3">
                            {opts.map((option: string, index: number) => (
                              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`question-${currentQuestion.id}`}
                                  value={index}
                                  checked={examSessionData.answers.get(currentQuestion.id) === index}
                                  onChange={(e) => examSessionData.updateAnswer(currentQuestion.id, parseInt(e.target.value))}
                                  disabled={isTerminated}
                                  className="h-4 w-4 text-blue-600"
                                />
                                <span className="text-gray-900">{option}</span>
                              </label>
                            ))}
                          </div>
                        );
                      }

                      // Long-answer rendering for short/essay types in any casing (e.g., SHORT_ANSWER, short-answer, essay)
                      if (normalized === "short-answer" || normalized === "short_answer" || normalized === "essay") {
                        const value = (examSessionData.answers.get(currentQuestion.id) as string) || "";
                        return (
                          <textarea
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={8}
                            placeholder="Type your answer here..."
                            value={value}
                            onChange={(e) => examSessionData.updateAnswer(currentQuestion.id, e.target.value)}
                            disabled={isTerminated}
                          />
                        );
                      }

                      // Fallback: show a textarea to ensure answers can always be entered
                      const value = (examSessionData.answers.get(currentQuestion.id) as string) || "";
                      return (
                        <textarea
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={6}
                          placeholder="Type your answer here..."
                          value={value}
                          onChange={(e) => examSessionData.updateAnswer(currentQuestion.id, e.target.value)}
                          disabled={isTerminated}
                        />
                      );
                    })()}
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
                      playsInline
                      className="w-full rounded border"
                      ref={(video) => {
                        videoElementRef.current = video;
                        if (video && webcam.stream) {
                          // Only update if stream has changed to prevent flickering
                          if (video.srcObject !== webcam.stream) {
                            video.srcObject = webcam.stream;
                            // Play is called by autoplay attribute, but catch any errors
                            video.play().catch(() => {
                              // Silently handle play promise rejection
                            });
                          }
                        }
                      }}
                      key={`video-${webcam.isActive}`}
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

            {/* DEBUG_DEV_FACE_DETECTION_PANEL - Remove this entire block when done testing */}
            {exam.settings.requireWebcam && (
              <Card className="border-2 border-yellow-400 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2 text-yellow-800">
                    <Activity className="h-5 w-5" />
                    <span>DEBUG: Face Detection Status</span>
                  </CardTitle>
                  <p className="text-xs text-yellow-700">This panel is for testing only - will be removed later</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Detection Ready:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        faceDetection.isReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {faceDetection.isReady ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Webcam Active:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        webcam.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {webcam.isActive ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>

                  {faceDetection.lastDetection && (
                    <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
                      <h4 className="font-semibold text-sm mb-2 text-gray-800">Last Detection Result:</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Face Count:</span>
                          <span className={`font-medium px-2 py-1 rounded ${
                            faceDetection.lastDetection.faceCount === 0 
                              ? 'bg-red-100 text-red-800'
                              : faceDetection.lastDetection.hasMultipleFaces
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {faceDetection.lastDetection.faceCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Has Face:</span>
                          <span className={`font-medium px-2 py-1 rounded ${
                            faceDetection.lastDetection.hasFace 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {faceDetection.lastDetection.hasFace ? 'YES' : 'NO'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Multiple Faces:</span>
                          <span className={`font-medium px-2 py-1 rounded ${
                            faceDetection.lastDetection.hasMultipleFaces 
                              ? 'bg-orange-100 text-orange-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {faceDetection.lastDetection.hasMultipleFaces ? 'YES ⚠️' : 'NO'}
                          </span>
                        </div>
                        {faceDetection.lastDetection.confidence > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Confidence:</span>
                            <span className="font-medium text-gray-800">
                              {(faceDetection.lastDetection.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {faceDetection.lastDetection.headPose && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <h5 className="font-semibold text-xs mb-2 text-gray-700">Head Pose:</h5>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Yaw (Left/Right):</span>
                                <span className={`font-medium px-2 py-1 rounded text-xs ${
                                  Math.abs(faceDetection.lastDetection.headPose.yaw) > 30
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {faceDetection.lastDetection.headPose.yaw.toFixed(1)}°
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Pitch (Up/Down):</span>
                                <span className={`font-medium px-2 py-1 rounded text-xs ${
                                  Math.abs(faceDetection.lastDetection.headPose.pitch) > 25
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {faceDetection.lastDetection.headPose.pitch.toFixed(1)}°
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Roll (Tilt):</span>
                                <span className="font-medium text-gray-800">
                                  {faceDetection.lastDetection.headPose.roll.toFixed(1)}°
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-gray-600">Looking Away:</span>
                                <span className={`font-medium px-2 py-1 rounded text-xs ${
                                  faceDetection.lastDetection.headPose.isLookingAway
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {faceDetection.lastDetection.headPose.isLookingAway ? 'YES ⚠️' : 'NO'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!faceDetection.lastDetection && faceDetection.isReady && (
                    <div className="mt-4 p-3 bg-gray-100 rounded border border-gray-300">
                      <p className="text-xs text-gray-600 text-center">
                        Waiting for face detection... (runs every 2 seconds)
                      </p>
                    </div>
                  )}

                  {!faceDetection.isReady && (
                    <div className="mt-4 p-3 bg-yellow-100 rounded border border-yellow-300">
                      <p className="text-xs text-yellow-800 text-center">
                        Loading face detection models...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            {/* END_DEBUG_DEV_FACE_DETECTION_PANEL */}

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