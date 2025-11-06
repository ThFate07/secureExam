"use client";

/**
 * Client-side face detection hook using face-api.js
 * Provides real-time face detection on webcam stream
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Dynamic import for face-api.js to avoid SSR and Node.js module issues
let faceapi: any = null;
const loadFaceApi = async () => {
  if (typeof window === 'undefined') return null;
  if (faceapi) return faceapi;
  
  try {
    faceapi = await import('face-api.js');
    return faceapi;
  } catch (error) {
    console.error('[Face Detection] Failed to load face-api.js:', error);
    return null;
  }
};

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
    // Load face-api.js first if not already loaded
    const faceApiModule = await loadFaceApi();
    if (!faceApiModule) {
      throw new Error('Failed to load face-api.js module');
    }
    
    console.log('[Face Detection] Loading models from:', MODEL_URL);
    console.log('[Face Detection] Checking if face-api is available:', typeof faceApiModule);
    
    // Test if models are accessible
    try {
      const testResponse = await fetch(`${MODEL_URL}/tiny_face_detector/tiny_face_detector_model-weights_manifest.json`);
      if (!testResponse.ok) {
        throw new Error(`Model files not accessible: ${testResponse.status} ${testResponse.statusText}`);
      }
      console.log('[Face Detection] ✓ Model files are accessible');
    } catch (fetchError) {
      console.error('[Face Detection] ✗ Cannot access model files:', fetchError);
      throw new Error(`Cannot access model files from ${MODEL_URL}. Make sure the server is running and models are in public/models/face-api/`);
    }
    
    // face-api.js automatically looks in subdirectories, but we need to ensure the base path is correct
    // The models are in: /models/face-api/tiny_face_detector/, /models/face-api/face_landmark_68/, etc.
    // face-api.js will automatically append the model name subdirectory
    
    console.log('[Face Detection] Loading tinyFaceDetector...');
    await faceApiModule.nets.tinyFaceDetector.loadFromUri(`${MODEL_URL}/tiny_face_detector`);
    console.log('[Face Detection] ✓ tinyFaceDetector loaded');
    
    console.log('[Face Detection] Loading faceLandmark68Net...');
    await faceApiModule.nets.faceLandmark68Net.loadFromUri(`${MODEL_URL}/face_landmark_68`);
    console.log('[Face Detection] ✓ faceLandmark68Net loaded');
    
    console.log('[Face Detection] Loading faceRecognitionNet...');
    await faceApiModule.nets.faceRecognitionNet.loadFromUri(`${MODEL_URL}/face_recognition`);
    console.log('[Face Detection] ✓ faceRecognitionNet loaded');
    
    modelsLoaded = true;
    console.log('[Face Detection] ✓ All client models loaded successfully');
  } catch (error) {
    console.error('[Face Detection] ✗ Failed to load client models:', error);
    console.error('[Face Detection] Error details:', error instanceof Error ? error.message : String(error));
    console.error('[Face Detection] Make sure:');
    console.error('[Face Detection]   1. Server is running (npm run dev)');
    console.error('[Face Detection]   2. Model files are in public/models/face-api/');
    console.error('[Face Detection]   3. Files are accessible at http://localhost:3000/models/face-api/');
    throw error;
  }
}

/**
 * Calculate head pose from landmarks
 */
function calculateHeadPose(landmarks: any): {
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

    const YAW_THRESHOLD = 45; // Increased from 30 to 45 degrees (more lenient)
    const PITCH_THRESHOLD = 35; // Increased from 25 to 35 degrees (more lenient)
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
    console.log('[Face Detection] Models not loaded, loading now...');
    await loadModels();
  }

  // Get face-api module
  const faceApiModule = await loadFaceApi();
  if (!faceApiModule) {
    console.error('[Face Detection] face-api.js not available');
    return {
      faceCount: 0,
      hasFace: false,
      hasMultipleFaces: false,
      confidence: 0,
    };
  }

  try {
    // Check if input is valid
    if (!input || (input instanceof HTMLVideoElement && input.readyState < 2)) {
      console.log('[Face Detection] Input not ready:', { 
        hasInput: !!input, 
        readyState: input instanceof HTMLVideoElement ? input.readyState : 'N/A' 
      });
      return {
        faceCount: 0,
        hasFace: false,
        hasMultipleFaces: false,
        confidence: 0,
      };
    }

    console.log('[Face Detection] Starting face detection with tiny_face_detector');
    // Use tiny_face_detector for speed (client-side)
    // Lower threshold = more sensitive to angled/profile faces
    // We use 0.25 to detect faces even when turned left/right (profile views)
    // Balanced settings - sensitive enough for movement but not too low to avoid false positives
    const detectionOptions = new faceApiModule.TinyFaceDetectorOptions({
      inputSize: 512, // Balanced size - good accuracy without too many false positives
      scoreThreshold: 0.3, // Balanced threshold (0.3) - detects faces during movement but filters out false positives
    });

    console.log('[Face Detection] Calling detectAllFaces...');
    const detections = await faceApiModule
      .detectAllFaces(input, detectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    console.log('[Face Detection] Raw detections found:', detections.length);

    if (detections.length === 0) {
      return {
        faceCount: 0,
        hasFace: false,
        hasMultipleFaces: false,
        confidence: 0,
      };
    }

    // Filter out duplicate/false positive detections
    // If detections are too close together (overlapping), they're likely the same face
    const filteredDetections: typeof detections = [];
    const MIN_DISTANCE_BETWEEN_FACES = 100; // Minimum pixel distance between distinct faces
    
    for (let i = 0; i < detections.length; i++) {
      const detection = detections[i];
      let isDuplicate = false;
      
      // Check if this detection overlaps significantly with any already filtered detection
      for (const filtered of filteredDetections) {
        const box1 = detection.detection.box;
        const box2 = filtered.detection.box;
        
        // Calculate center points
        const center1X = box1.x + box1.width / 2;
        const center1Y = box1.y + box1.height / 2;
        const center2X = box2.x + box2.width / 2;
        const center2Y = box2.y + box2.height / 2;
        
        // Calculate distance between centers
        const distance = Math.sqrt(
          Math.pow(center2X - center1X, 2) + Math.pow(center2Y - center1Y, 2)
        );
        
        // If centers are too close, it's likely the same face detected multiple times
        if (distance < MIN_DISTANCE_BETWEEN_FACES) {
          // Keep the detection with higher confidence
          if (detection.detection.score > filtered.detection.score) {
            // Remove the lower confidence one and add this one
            const index = filteredDetections.indexOf(filtered);
            filteredDetections[index] = detection;
          }
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        filteredDetections.push(detection);
      }
    }
    
    console.log('[Face Detection] Filtered detections:', filteredDetections.length, '(removed', detections.length - filteredDetections.length, 'duplicates)');

    if (filteredDetections.length === 0) {
      return {
        faceCount: 0,
        hasFace: false,
        hasMultipleFaces: false,
        confidence: 0,
      };
    }

    // Sort by confidence and take the highest confidence detection as primary
    filteredDetections.sort((a: typeof detections[0], b: typeof detections[0]) => b.detection.score - a.detection.score);
    const primaryFace = filteredDetections[0];
    const headPose = primaryFace.landmarks
      ? calculateHeadPose(primaryFace.landmarks)
      : undefined;

    return {
      faceCount: filteredDetections.length,
      hasFace: true,
      hasMultipleFaces: filteredDetections.length > 1,
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
  
  // Track consecutive violation states to avoid false positives
  const noFaceCountRef = useRef(0);
  const lookingAwayCountRef = useRef(0);
  const lastViolationTimeRef = useRef<Map<string, number>>(new Map());
  const VIOLATION_COOLDOWN_MS = 5000; // 5 seconds between same violation type (more lenient)
  const REQUIRED_CONSECUTIVE_NO_FACE = 6; // Require 6 consecutive "no face" detections (3 seconds at 500ms intervals)
  
  // Track recent head pose to handle cases where face detection fails but head was turned
  const lastKnownHeadPoseRef = useRef<{ yaw: number; pitch: number; timestamp: number } | null>(null);
  const HEAD_POSE_MEMORY_MS = 5000; // 5 seconds - remember head pose longer for movement
  
  // Track detection history for smoothing - helps with fast movement
  const detectionHistoryRef = useRef<Array<{ hasFace: boolean; timestamp: number; confidence: number }>>([]);
  const HISTORY_WINDOW_MS = 5000; // 5 second window for smoothing
  const MIN_DETECTIONS_IN_WINDOW = 3; // Need at least 3 detections in window to consider face present
  
  // Grace period for brief face losses (hair movement, hand gestures, fast movement)
  const lastFaceDetectionTimeRef = useRef<number>(0);
  const FACE_GRACE_PERIOD_MS = 5000; // 5 seconds - if face was detected recently, don't immediately trigger "no face"
  
  // Track consecutive face detections to establish face presence
  const consecutiveFaceDetectionsRef = useRef(0);
  const MIN_CONSECUTIVE_FACE_FOR_PRESENCE = 2; // Need 2 consecutive detections to establish face is present

  // Initialize models
  useEffect(() => {
    if (!enabled || isInitializingRef.current) {
      console.log('[Face Detection] Skipping initialization:', { enabled, isInitializing: isInitializingRef.current });
      return;
    }

    console.log('[Face Detection] Starting model initialization...');
    isInitializingRef.current = true;
    
    loadModels()
      .then(() => {
        console.log('[Face Detection] Models loaded, setting isReady to true');
        setIsReady(true);
        isInitializingRef.current = false;
      })
      .catch((error) => {
        console.error('[Face Detection] Failed to initialize models:', error);
        console.error('[Face Detection] Full error:', error);
        // Don't set isReady to true on error, but allow retry
        isInitializingRef.current = false;
        // Try to load again after a delay
        setTimeout(() => {
          if (enabled && !modelsLoaded) {
            console.log('[Face Detection] Retrying model loading...');
            isInitializingRef.current = false;
          }
        }, 5000);
      });
  }, [enabled]);

  // Run detection on video element
  useEffect(() => {
    console.log('[Face Detection] Detection effect triggered:', { enabled, isReady, hasVideoElement: !!videoElement });
    
    if (!enabled || !isReady || !videoElement) {
      console.log('[Face Detection] Conditions not met, stopping detection:', { enabled, isReady, hasVideoElement: !!videoElement });
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      return;
    }

    console.log('[Face Detection] Starting detection interval');
    
    // Run detection every 300ms for very fast detection and better movement handling
    detectionIntervalRef.current = setInterval(async () => {
      try {
        // Check if video is ready
        if (!videoElement || videoElement.readyState < 2) {
          console.log('[Face Detection] Video not ready, readyState:', videoElement?.readyState);
          // Video not ready yet, skip this cycle
          return;
        }

        console.log('[Face Detection] Running detection...');
        const result = await detectFacesInImage(videoElement);
        console.log('[Face Detection] Detection result:', result);
        setLastDetection(result);

        if (onDetection) {
          onDetection(result);
        }

        // Check for violations with debouncing and consecutive detection requirements
        if (onViolation) {
          const now = Date.now();
          
          // Update detection history for smoothing
          detectionHistoryRef.current.push({
            hasFace: result.hasFace,
            timestamp: now,
            confidence: result.confidence,
          });
          
          // Remove old entries from history (older than HISTORY_WINDOW_MS)
          detectionHistoryRef.current = detectionHistoryRef.current.filter(
            entry => now - entry.timestamp < HISTORY_WINDOW_MS
          );
          
          // Track consecutive face detections
          if (result.hasFace && result.confidence > 0.2) {
            consecutiveFaceDetectionsRef.current += 1;
          } else {
            // Only reset if we have multiple consecutive failures
            if (consecutiveFaceDetectionsRef.current > 0) {
              consecutiveFaceDetectionsRef.current = Math.max(0, consecutiveFaceDetectionsRef.current - 1);
            }
          }
          
          // Calculate smoothed face detection status using weighted approach
          // Give more weight to recent detections
          const recentDetections = detectionHistoryRef.current.filter(
            entry => entry.hasFace && entry.confidence > 0.2 // Lower confidence threshold
          );
          
          // Calculate weighted detection score (recent detections count more)
          let weightedScore = 0;
          detectionHistoryRef.current.forEach(entry => {
            if (entry.hasFace && entry.confidence > 0.2) {
              const age = now - entry.timestamp;
              const weight = 1 - (age / HISTORY_WINDOW_MS); // More recent = higher weight
              weightedScore += weight * entry.confidence;
            }
          });
          
          const hasRecentFaceDetections = recentDetections.length >= MIN_DETECTIONS_IN_WINDOW || 
                                          weightedScore > 0.5 ||
                                          consecutiveFaceDetectionsRef.current >= MIN_CONSECUTIVE_FACE_FOR_PRESENCE;
          
          // Update last known head pose if face is detected
          if (result.hasFace && result.headPose) {
            lastKnownHeadPoseRef.current = {
              yaw: result.headPose.yaw,
              pitch: result.headPose.pitch,
              timestamp: now,
            };
            lastFaceDetectionTimeRef.current = now; // Update last face detection time
          } else if (result.hasFace) {
            // Face detected even without head pose - still update timestamp
            lastFaceDetectionTimeRef.current = now;
          }
          
          // Check for MULTIPLE_FACES - trigger immediately but with cooldown
          if (result.hasMultipleFaces) {
            const lastTime = lastViolationTimeRef.current.get('MULTIPLE_FACES') || 0;
            if (now - lastTime > VIOLATION_COOLDOWN_MS) {
              console.log('[Face Detection] ⚠️ Triggering MULTIPLE_FACES violation');
              onViolation('MULTIPLE_FACES', `Multiple faces detected (${result.faceCount} faces)`);
              lastViolationTimeRef.current.set('MULTIPLE_FACES', now);
            }
          }
          
          // Check for LOOKING_AWAY - if face is detected but looking away
          if (result.hasFace && result.headPose?.isLookingAway) {
            lookingAwayCountRef.current += 1;
            noFaceCountRef.current = 0; // Reset no face count
            
            console.log(`[Face Detection] Looking away detected (consecutive: ${lookingAwayCountRef.current}/3)`);
            
            if (lookingAwayCountRef.current >= 3) {
              const lastTime = lastViolationTimeRef.current.get('LOOKING_AWAY') || 0;
              if (now - lastTime > VIOLATION_COOLDOWN_MS) {
                console.log('[Face Detection] ⚠️ Triggering LOOKING_AWAY violation');
                onViolation(
                  'LOOKING_AWAY',
                  `Looking away detected (yaw: ${result.headPose.yaw.toFixed(1)}°, pitch: ${result.headPose.pitch.toFixed(1)}°)`
                );
                lastViolationTimeRef.current.set('LOOKING_AWAY', now);
              }
            }
          } else if (result.hasFace) {
            // Face detected and not looking away - reset counters
            lookingAwayCountRef.current = 0;
            noFaceCountRef.current = 0;
          } else if (hasRecentFaceDetections) {
            // Face not detected in current frame but recent history shows face present
            // Reset counters - face is likely still there, just temporarily undetected
            console.log('[Face Detection] Face not in current frame but recent history confirms presence - resetting counters');
            noFaceCountRef.current = Math.max(0, noFaceCountRef.current - 2); // Aggressive reset
            lookingAwayCountRef.current = 0;
          }
          
          // Check for NO_FACE_DETECTED - but first check various scenarios
          if (!result.hasFace) {
            
            // Check grace period - if face was detected recently, don't immediately trigger "no face"
            const timeSinceLastFace = now - lastFaceDetectionTimeRef.current;
            const inGracePeriod = timeSinceLastFace < FACE_GRACE_PERIOD_MS;
            
            // Check if we have recent face detections in history (for fast movement/hair movement)
            const hasRecentDetections = hasRecentFaceDetections || inGracePeriod;
            
            // Check if we recently had a face with high yaw/pitch (head turned)
            // If so, treat it as "looking away" rather than "no face"
            const recentHeadPose = lastKnownHeadPoseRef.current;
            const isRecentHeadPose = recentHeadPose && (now - recentHeadPose.timestamp) < HEAD_POSE_MEMORY_MS;
            const wasLookingAway = isRecentHeadPose && (
              Math.abs(recentHeadPose.yaw) > 30 || Math.abs(recentHeadPose.pitch) > 25
            );
            
            if (hasRecentDetections && !wasLookingAway) {
              // Face was detected recently - likely fast movement, hair adjustment, or brief occlusion
              // Don't count this as "no face" - aggressively reset counter
              console.log(`[Face Detection] Face temporarily lost but detected recently (weighted score: ${weightedScore.toFixed(2)}, recent detections: ${recentDetections.length}) - likely movement or brief occlusion`);
              noFaceCountRef.current = Math.max(0, noFaceCountRef.current - 3); // Aggressive reset
              // Don't increment counters during grace period or when history shows face presence
            } else if (wasLookingAway) {
              // Face detection failed but we know the head was turned - treat as looking away
              console.log('[Face Detection] Face detection failed but head was recently turned - treating as LOOKING_AWAY');
              lookingAwayCountRef.current += 1;
              noFaceCountRef.current = 0; // Reset no face count
              
              if (lookingAwayCountRef.current >= 3) {
                const lastTime = lastViolationTimeRef.current.get('LOOKING_AWAY') || 0;
                if (now - lastTime > VIOLATION_COOLDOWN_MS) {
                  console.log('[Face Detection] ⚠️ Triggering LOOKING_AWAY violation (face lost but head was turned)');
                  onViolation(
                    'LOOKING_AWAY',
                    `Looking away detected (head turned - yaw: ${recentHeadPose.yaw.toFixed(1)}°, pitch: ${recentHeadPose.pitch.toFixed(1)}°)`
                  );
                  lastViolationTimeRef.current.set('LOOKING_AWAY', now);
                }
              }
            } else {
              // True "no face" scenario - no recent detections, not in grace period, head not turned
              // Only increment if we're really sure there's no face
              noFaceCountRef.current += 1;
              lookingAwayCountRef.current = 0; // Reset looking away count
              
              console.log(`[Face Detection] No face detected (consecutive: ${noFaceCountRef.current}/${REQUIRED_CONSECUTIVE_NO_FACE}, grace period: ${inGracePeriod ? 'active' : 'expired'}, weighted score: ${weightedScore.toFixed(2)}, recent: ${recentDetections.length})`);
              
              // Only trigger if we have sustained "no face" detections AND no recent history
              if (noFaceCountRef.current >= REQUIRED_CONSECUTIVE_NO_FACE && !hasRecentFaceDetections && !inGracePeriod) {
                const lastTime = lastViolationTimeRef.current.get('NO_FACE_DETECTED') || 0;
                if (now - lastTime > VIOLATION_COOLDOWN_MS) {
                  console.log('[Face Detection] ⚠️ Triggering NO_FACE_DETECTED violation (sustained absence)');
                  onViolation('NO_FACE_DETECTED', 'No face detected in webcam');
                  lastViolationTimeRef.current.set('NO_FACE_DETECTED', now);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('[Face Detection] Detection error:', error);
      }
      }, 300); // Check every 300ms for very responsive detection and movement handling

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

