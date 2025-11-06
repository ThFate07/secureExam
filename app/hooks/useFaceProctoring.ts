"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ensureFaceApiModels,
  FaceDetectionWithLandmarks,
  FaceLandmarks,
  FaceApi,
} from "../lib/faceApiLoader";

interface UseFaceProctoringProps {
  stream: MediaStream | null;
  enabled: boolean;
  onViolation?: (message: string) => void;
  detectionIntervalMs?: number;
}

export type FaceOrientationState = "ok" | "looking-away" | "unknown";

export interface FaceMonitoringState {
  status: "idle" | "loading" | "ready" | "error";
  message: string | null;
  faceCount: number;
  orientation: FaceOrientationState;
  lastDetection: number | null;
}

const DEFAULT_STATE: FaceMonitoringState = {
  status: "idle",
  message: null,
  faceCount: 0,
  orientation: "unknown",
  lastDetection: null,
};

const ORIENTATION_VIOLATION_MESSAGE = "Face appears to be looking away from the screen";
const NO_FACE_MESSAGE = "No face detected in webcam feed";
const MULTIPLE_FACE_MESSAGE = "Multiple faces detected in webcam feed";

const VIOLATION_COOLDOWN_MS = 15_000;

function averagePoint(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  const total = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  const count = points.length || 1;
  return {
    x: total.x / count,
    y: total.y / count,
  };
}

function determineOrientation(landmarks: FaceLandmarks | undefined): FaceOrientationState {
  if (!landmarks) {
    return "unknown";
  }

  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const nose = landmarks.getNose();

  if (!leftEye.length || !rightEye.length || !nose.length) {
    return "unknown";
  }

  const leftEyeCenter = averagePoint(leftEye);
  const rightEyeCenter = averagePoint(rightEye);
  const eyeDistance = Math.hypot(
    rightEyeCenter.x - leftEyeCenter.x,
    rightEyeCenter.y - leftEyeCenter.y
  );

  if (!eyeDistance) {
    return "unknown";
  }

  const midPoint = {
    x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
    y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
  };

  const noseTip = nose[nose.length - 1];
  const horizontalOffset = (noseTip.x - midPoint.x) / eyeDistance;
  const verticalOffset = (noseTip.y - midPoint.y) / eyeDistance;

  const yawThreshold = 0.35;
  const pitchThreshold = 0.45;

  if (Math.abs(horizontalOffset) > yawThreshold || Math.abs(verticalOffset) > pitchThreshold) {
    return "looking-away";
  }

  return "ok";
}

function buildStatePatch(
  base: FaceMonitoringState,
  patch: Partial<FaceMonitoringState>
): FaceMonitoringState {
  return {
    ...base,
    ...patch,
  };
}

export function useFaceProctoring({
  stream,
  enabled,
  onViolation,
  detectionIntervalMs = 2_000,
}: UseFaceProctoringProps): FaceMonitoringState {
  const [state, setState] = useState<FaceMonitoringState>(() => ({
    ...DEFAULT_STATE,
    status: enabled ? "loading" : "idle",
    message: enabled ? "Waiting for webcam stream..." : null,
  }));

  const violationTimestamps = useRef<Record<string, number>>({});
  const onViolationRef = useRef(onViolation);
  const faceApiRef = useRef<FaceApi | null>(null);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  // Memoised config prevents unnecessary resets when only unrelated props change
  const config = useMemo(
    () => ({
      stream,
      enabled,
      detectionIntervalMs,
    }),
    [stream, enabled, detectionIntervalMs]
  );

  useEffect(() => {
    if (!config.enabled) {
      setState({ ...DEFAULT_STATE, status: "idle" });
      return;
    }

    if (!config.stream) {
      setState({
        ...DEFAULT_STATE,
        status: "loading",
        message: "Waiting for webcam stream...",
      });
      return;
    }

    let cancelled = false;
    let detectionTimer: number | null = null;
    let videoEl: HTMLVideoElement | null = document.createElement("video");

    videoEl.srcObject = config.stream;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.autoplay = true;
    videoEl.setAttribute("aria-hidden", "true");
    videoEl.style.position = "fixed";
    videoEl.style.opacity = "0";
    videoEl.style.pointerEvents = "none";
    videoEl.style.width = "0";
    videoEl.style.height = "0";

    const cleanupVideo = () => {
      if (videoEl) {
        videoEl.pause();
        videoEl.srcObject = null;
        videoEl.remove();
      }
      videoEl = null;
    };

    const scheduleNext = () => {
      if (cancelled) return;
      detectionTimer = window.setTimeout(runDetection, config.detectionIntervalMs);
    };

    const triggerViolation = (key: string, message: string) => {
      const now = Date.now();
      const last = violationTimestamps.current[key] ?? 0;
      if (now - last < VIOLATION_COOLDOWN_MS) {
        return;
      }
      violationTimestamps.current[key] = now;
      onViolationRef.current?.(message);
    };

    const processDetections = (detections: FaceDetectionWithLandmarks[]) => {
      if (!detections.length) {
        setState((prev) =>
          buildStatePatch(prev, {
            status: "ready",
            message: NO_FACE_MESSAGE,
            faceCount: 0,
            orientation: "unknown",
            lastDetection: Date.now(),
          })
        );
        triggerViolation("no-face", NO_FACE_MESSAGE);
        return;
      }

      if (detections.length > 1) {
        setState((prev) =>
          buildStatePatch(prev, {
            status: "ready",
            message: MULTIPLE_FACE_MESSAGE,
            faceCount: detections.length,
            orientation: "unknown",
            lastDetection: Date.now(),
          })
        );
        triggerViolation("multiple-faces", MULTIPLE_FACE_MESSAGE);
        return;
      }

      const [singleDetection] = detections;
      const orientation = determineOrientation(singleDetection.landmarks);

      setState((prev) =>
        buildStatePatch(prev, {
          status: "ready",
          message:
            orientation === "ok"
              ? "Single face detected"
              : ORIENTATION_VIOLATION_MESSAGE,
          faceCount: 1,
          orientation,
          lastDetection: Date.now(),
        })
      );

      if (orientation === "looking-away") {
        triggerViolation("orientation", ORIENTATION_VIOLATION_MESSAGE);
      }
    };

    const runDetection = async () => {
      if (cancelled || !videoEl) {
        return;
      }

      try {
        if (!faceApiRef.current) {
          faceApiRef.current = await ensureFaceApiModels();
        }

        if (!videoEl.paused && videoEl.readyState >= 2) {
          const faceapi = faceApiRef.current;
          const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5,
          });
          const detections = await faceapi
            .detectAllFaces(videoEl, options)
            .withFaceLandmarks();
          processDetections(detections ?? []);
        }
      } catch (error) {
        console.error("[FaceProctoring] detection failed", error);
        setState((prev) =>
          buildStatePatch(prev, {
            status: "error",
            message: "Face detection failed. Check console for details.",
          })
        );
      } finally {
        scheduleNext();
      }
    };

    const startProcessing = async () => {
      setState((prev) =>
        buildStatePatch(prev, {
          status: "loading",
          message: "Initializing face detection...",
        })
      );

      try {
        if (!faceApiRef.current) {
          faceApiRef.current = await ensureFaceApiModels();
        }

        if (!videoEl) {
          return;
        }

        if (videoEl.readyState >= 2) {
          await videoEl.play().catch(() => undefined);
        } else {
          await new Promise<void>((resolve) => {
            const handler = () => {
              videoEl?.removeEventListener("loadeddata", handler);
              resolve();
            };
            videoEl?.addEventListener("loadeddata", handler, { once: true });
          });
          await videoEl.play().catch(() => undefined);
        }

        if (!cancelled) {
          setState((prev) =>
            buildStatePatch(prev, {
              status: "ready",
              message: "Face monitoring active",
            })
          );
          runDetection();
        }
      } catch (error) {
        console.error("[FaceProctoring] initialization failed", error);
        setState({
          status: "error",
          message: "Unable to initialise face detection",
          faceCount: 0,
          orientation: "unknown",
          lastDetection: null,
        });
      }
    };

    startProcessing();

    return () => {
      cancelled = true;
      if (detectionTimer) {
        window.clearTimeout(detectionTimer);
      }
      cleanupVideo();
    };
  }, [config]);

  return state;
}
