"use client";

/**
 * Client-side face detection hook using face-api.js
 * Provides real-time face detection on webcam stream
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

interface FaceDetectionResult {
  faceCount: number;
  hasFace: boolean;
  hasMultipleFaces: boolean;
  confidence: number;
  headPose?: {
    yaw: number;
    pitch: number;
    roll: number;
    isLookingAway: boolean;
  };
  descriptor?: Float32Array;
}

interface UseFaceDetectionProps {
  enabled?: boolean;
  videoElement?: HTMLVideoElement | null;
  onDetection?: (result: FaceDetectionResult) => void;
  onViolation?: (type: 'NO_FACE_DETECTED' | 'MULTIPLE_FACES' | 'LOOKING_AWAY', description: string) => void;
}

let modelsLoaded = false;
const MODEL_URL = '/models/face-api';

/**
 * Load face-api.js models (tiny_face_detector for speed on client)
 */
async function loadModels(): Promise<void> {
  if (modelsLoaded) {
    return;
  }

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('[Face Detection] Client models loaded');
  } catch (error) {
    console.error('[Face Detection] Failed to load client models:', error);
    throw error;
  }
}

/**
 * Calculate head pose from landmarks
 */
function calculateHeadPose(landmarks: faceapi.FaceLandmarks68): {
  yaw: number;
  pitch: number;
  roll: number;
  isLookingAway: boolean;
} {
  try {
    const nose = landmarks.positions[30];
    const leftEye = landmarks.positions[36];
    const rightEye = landmarks.positions[45];

    const eyeDistance = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
    );

    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const noseOffsetX = nose.x - eyeCenterX;
    const yaw = (noseOffsetX / eyeDistance) * 60;

    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const noseOffsetY = nose.y - eyeCenterY;
    const pitch = (noseOffsetY / eyeDistance) * 60;

    const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const roll = (eyeAngle * 180) / Math.PI;

    const YAW_THRESHOLD = 30;
    const PITCH_THRESHOLD = 25;
    const isLookingAway = Math.abs(yaw) > YAW_THRESHOLD || Math.abs(pitch) > PITCH_THRESHOLD;

    return { yaw, pitch, roll, isLookingAway };
  } catch (error) {
    return { yaw: 0, pitch: 0, roll: 0, isLookingAway: false };
  }
}

/**
 * Detect faces in a video frame or image
 */
async function detectFacesInImage(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetectionResult> {
  if (!modelsLoaded) {
    await loadModels();
  }

  try {
    // Use tiny_face_detector for speed (client-side)
    const detectionOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5,
    });

    const detections = await faceapi
      .detectAllFaces(input, detectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      return {
        faceCount: 0,
        hasFace: false,
        hasMultipleFaces: false,
        confidence: 0,
      };
    }

    const primaryFace = detections[0];
    const headPose = primaryFace.landmarks
      ? calculateHeadPose(primaryFace.landmarks)
      : undefined;

    return {
      faceCount: detections.length,
      hasFace: true,
      hasMultipleFaces: detections.length > 1,
      confidence: primaryFace.detection.score,
      headPose,
      descriptor: primaryFace.descriptor,
    };
  } catch (error) {
    console.error('[Face Detection] Error detecting faces:', error);
    return {
      faceCount: 0,
      hasFace: false,
      hasMultipleFaces: false,
      confidence: 0,
    };
  }
}

export function useFaceDetection({
  enabled = false,
  videoElement,
  onDetection,
  onViolation,
}: UseFaceDetectionProps) {
  const [isReady, setIsReady] = useState(false);
  const [lastDetection, setLastDetection] = useState<FaceDetectionResult | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);

  // Initialize models
  useEffect(() => {
    if (!enabled || isInitializingRef.current) return;

    isInitializingRef.current = true;
    loadModels()
      .then(() => {
        setIsReady(true);
        isInitializingRef.current = false;
      })
      .catch((error) => {
        console.error('[Face Detection] Failed to initialize:', error);
        isInitializingRef.current = false;
      });
  }, [enabled]);

  // Run detection on video element
  useEffect(() => {
    if (!enabled || !isReady || !videoElement) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      return;
    }

    // Run detection every 2 seconds
    detectionIntervalRef.current = setInterval(async () => {
      try {
        const result = await detectFacesInImage(videoElement);
        setLastDetection(result);

        if (onDetection) {
          onDetection(result);
        }

        // Check for violations
        if (onViolation) {
          if (!result.hasFace) {
            onViolation('NO_FACE_DETECTED', 'No face detected in webcam');
          } else if (result.hasMultipleFaces) {
            onViolation('MULTIPLE_FACES', `Multiple faces detected (${result.faceCount} faces)`);
          } else if (result.headPose?.isLookingAway) {
            onViolation(
              'LOOKING_AWAY',
              `Looking away detected (yaw: ${result.headPose.yaw.toFixed(1)}°, pitch: ${result.headPose.pitch.toFixed(1)}°)`
            );
          }
        }
      } catch (error) {
        console.error('[Face Detection] Detection error:', error);
      }
    }, 2000);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [enabled, isReady, videoElement, onDetection, onViolation]);

  // Manual detection function
  const detect = useCallback(
    async (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<FaceDetectionResult> => {
      if (!isReady) {
        await loadModels();
        setIsReady(true);
      }
      return detectFacesInImage(input);
    },
    [isReady]
  );

  return {
    isReady,
    lastDetection,
    detect,
  };
}

