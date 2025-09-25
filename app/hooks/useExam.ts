"use client";

import { useState, useEffect, useCallback } from "react";
import { formatTime } from "../lib/utils";
import { Question } from "../types";

interface UseExamTimerProps {
  initialTime: number; // in seconds
  onTimeUp: () => void;
  isActive?: boolean;
}

export function useExamTimer({ initialTime, onTimeUp, isActive = true }: UseExamTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(isActive);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, onTimeUp]);

  const pauseTimer = useCallback(() => setIsRunning(false), []);
  const resumeTimer = useCallback(() => setIsRunning(true), []);
  const resetTimer = useCallback(() => {
    setTimeRemaining(initialTime);
    setIsRunning(isActive);
  }, [initialTime, isActive]);

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isRunning,
    pauseTimer,
    resumeTimer,
    resetTimer,
    isTimeUp: timeRemaining <= 0,
  };
}

interface UseAntiCheatProps {
  onViolation: (violation: string) => void;
  enabled?: boolean;
}

export function useAntiCheat({ onViolation, enabled = true }: UseAntiCheatProps) {
  const [violations, setViolations] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) return;

    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onViolation("Right-click detected");
    };

    // Prevent keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
        onViolation("Developer tools access attempted");
      }

      // Prevent Alt+Tab
      if (e.altKey && e.key === "Tab") {
        e.preventDefault();
        onViolation("Alt+Tab detected");
      }

      // Prevent Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "x")) {
        e.preventDefault();
        onViolation("Copy/Paste/Cut attempted");
      }
    };

    // Detect tab switching/window blur
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onViolation("Tab switch or window minimized");
      }
    };

    const handleWindowBlur = () => {
      onViolation("Window lost focus");
    };

    // Prevent print
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      onViolation("Print attempt detected");
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("beforeprint", handleBeforePrint);

    // Request fullscreen
    const requestFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch (error) {
        onViolation("Fullscreen mode not available");
      }
    };

    requestFullscreen();

    // Monitor fullscreen exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onViolation("Fullscreen mode exited");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("beforeprint", handleBeforePrint);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      
      // Exit fullscreen on cleanup
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
    };
  }, [enabled, onViolation]);

  const addViolation = useCallback((violation: string) => {
    setViolations(prev => [...prev, violation]);
    onViolation(violation);
  }, [onViolation]);

  return {
    violations,
    addViolation,
  };
}

interface UseWebcamProps {
  enabled?: boolean;
  onError?: (error: string) => void;
}

export function useWebcam({ enabled = false, onError }: UseWebcamProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startWebcam = useCallback(async () => {
    if (!enabled) return;

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      
      setStream(mediaStream);
      setIsActive(true);
      setError(null);
    } catch {
      const errorMessage = "Failed to access webcam. Please ensure camera permissions are granted.";
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [enabled, onError]);

  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);
    }
  }, [stream]);

  const captureSnapshot = useCallback(async (): Promise<string | null> => {
    if (!stream || !isActive) return null;

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) return null;

    video.srcObject = stream;
    video.play();

    return await new Promise<string | null>((resolve) => {
      video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      });
    });
  }, [stream, isActive]);

  useEffect(() => {
    if (enabled) {
      startWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [enabled, startWebcam, stopWebcam]);

  return {
    stream,
    isActive,
    error,
    startWebcam,
    stopWebcam,
    captureSnapshot,
  };
}

interface UseExamSessionProps {
  examId: string;
  questions: Question[];
  onSubmit: (answers: Map<string, string | number>) => void;
}

export function useExamSession({ questions, onSubmit }: UseExamSessionProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string | number>>(new Map());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  const updateAnswer = useCallback((questionId: string, answer: string | number) => {
    setAnswers(prev => new Map(prev.set(questionId, answer)));
  }, []);

  const toggleFlag = useCallback((questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  }, [questions.length]);

  const goToNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const goToPrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const submitExam = useCallback(() => {
    if (!isSubmitted) {
      setIsSubmitted(true);
      onSubmit(answers);
    }
  }, [answers, isSubmitted, onSubmit]);

  const getProgress = useCallback(() => {
    const answeredCount = questions.filter(q => answers.has(q.id)).length;
    return {
      answered: answeredCount,
      total: questions.length,
      percentage: (answeredCount / questions.length) * 100,
    };
  }, [answers, questions]);

  return {
    currentQuestionIndex,
    currentQuestion,
    answers,
    flaggedQuestions,
    isSubmitted,
    updateAnswer,
    toggleFlag,
    goToQuestion,
    goToNext,
    goToPrevious,
    submitExam,
    getProgress,
    canGoNext: currentQuestionIndex < questions.length - 1,
    canGoPrevious: currentQuestionIndex > 0,
  };
}