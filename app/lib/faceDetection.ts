/**
 * Server-side face detection service using face-api.js and TensorFlow.js
 * Provides face detection, face matching, and head pose detection
 */

import * as tf from '@tensorflow/tfjs-node';
import * as faceapi from 'face-api.js';
import sharp from 'sharp';
import path from 'path';

// Try to load canvas, but make it optional
let Canvas: any, Image: any, ImageData: any;
let canvasAvailable = false;

try {
  const canvasModule = require('canvas');
  Canvas = canvasModule.Canvas;
  Image = canvasModule.Image;
  ImageData = canvasModule.ImageData;
  // Configure face-api.js to use node-canvas
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
  canvasAvailable = true;
} catch (error) {
  console.warn('[Face Detection] Canvas not available, server-side detection will be limited');
  canvasAvailable = false;
}

interface FaceDetectionResult {
  faces: Array<{
    detection: {
      score: number;
      box: { x: number; y: number; width: number; height: number };
    };
    landmarks?: faceapi.FaceLandmarks68;
    descriptor?: Float32Array;
  }>;
  faceCount: number;
  hasFace: boolean;
  hasMultipleFaces: boolean;
}

interface HeadPoseResult {
  yaw: number; // Left/right rotation in degrees
  pitch: number; // Up/down rotation in degrees
  roll: number; // Tilt rotation in degrees
  isLookingAway: boolean;
}

interface FaceMatchResult {
  similarity: number; // 0-1, higher = more similar
  isMatch: boolean; // true if similarity >= threshold
  isFaceChanged: boolean; // true if similarity < threshold
}

// Model loading state
let modelsLoaded = false;
const MODEL_PATH = path.join(process.cwd(), 'public', 'models', 'face-api');

/**
 * Load face-api.js models (SSD MobileNet for accuracy)
 */
export async function loadModels(): Promise<void> {
  if (modelsLoaded) {
    return;
  }

  try {
    console.log('[Face Detection] Loading models...');
    
    // Load detection model (SSD MobileNet V1 for better accuracy on server)
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    
    // Load landmark model (for head pose detection)
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    
    // Load recognition model (for face matching)
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
    
    modelsLoaded = true;
    console.log('[Face Detection] Models loaded successfully');
  } catch (error) {
    console.error('[Face Detection] Failed to load models:', error);
    throw new Error('Failed to load face detection models');
  }
}

/**
 * Convert image buffer to HTMLImageElement for face-api.js
 */
async function bufferToImage(buffer: Buffer): Promise<HTMLImageElement> {
  if (!canvasAvailable || !Image) {
    throw new Error('Canvas not available for image processing');
  }

  const image = new Image();
  const data = await sharp(buffer)
    .resize(640, 480, { fit: 'inside', withoutEnlargement: true })
    .jpeg()
    .toBuffer();
  
  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image as any);
    image.onerror = reject;
    image.src = data as any;
  });
}

/**
 * Detect faces in an image
 */
export async function detectFaces(imageBuffer: Buffer): Promise<FaceDetectionResult> {
  if (!canvasAvailable) {
    // Fallback: return empty result if canvas not available
    console.warn('[Face Detection] Canvas not available, skipping server-side detection');
    return {
      faces: [],
      faceCount: 0,
      hasFace: false,
      hasMultipleFaces: false,
    };
  }

  if (!modelsLoaded) {
    await loadModels();
  }

  try {
    const image = await bufferToImage(imageBuffer);
    
    // Use SSD MobileNet for better accuracy
    const detectionOptions = new faceapi.SsdMobilenetv1Options({ 
      minConfidence: 0.5,
      maxResults: 5 
    });
    
    // Detect faces with landmarks and descriptors
    const detections = await faceapi
      .detectAllFaces(image, detectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const faces = detections.map((detection) => ({
      detection: {
        score: detection.detection.score,
        box: {
          x: detection.detection.box.x,
          y: detection.detection.box.y,
          width: detection.detection.box.width,
          height: detection.detection.box.height,
        },
      },
      landmarks: detection.landmarks,
      descriptor: detection.descriptor,
    }));

    return {
      faces,
      faceCount: faces.length,
      hasFace: faces.length > 0,
      hasMultipleFaces: faces.length > 1,
    };
  } catch (error) {
    console.error('[Face Detection] Error detecting faces:', error);
    return {
      faces: [],
      faceCount: 0,
      hasFace: false,
      hasMultipleFaces: false,
    };
  }
}

/**
 * Calculate head pose (yaw, pitch, roll) from face landmarks
 */
export function detectHeadPose(landmarks: faceapi.FaceLandmarks68): HeadPoseResult {
  try {
    // Get key facial points
    const nose = landmarks.positions[30]; // Nose tip
    const leftEye = landmarks.positions[36]; // Left eye corner
    const rightEye = landmarks.positions[45]; // Right eye corner
    const mouthLeft = landmarks.positions[48]; // Left mouth corner
    const mouthRight = landmarks.positions[54]; // Right mouth corner

    // Calculate distances
    const eyeDistance = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
    );
    const mouthDistance = Math.sqrt(
      Math.pow(mouthRight.x - mouthLeft.x, 2) + Math.pow(mouthRight.y - mouthLeft.y, 2)
    );

    // Calculate yaw (left/right rotation)
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const noseOffsetX = nose.x - eyeCenterX;
    const yaw = (noseOffsetX / eyeDistance) * 60; // Approximate degrees

    // Calculate pitch (up/down rotation)
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const noseOffsetY = nose.y - eyeCenterY;
    const pitch = (noseOffsetY / eyeDistance) * 60; // Approximate degrees

    // Calculate roll (tilt rotation)
    const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const roll = (eyeAngle * 180) / Math.PI;

    // Thresholds for "looking away"
    const YAW_THRESHOLD = 30; // degrees
    const PITCH_THRESHOLD = 25; // degrees

    const isLookingAway = Math.abs(yaw) > YAW_THRESHOLD || Math.abs(pitch) > PITCH_THRESHOLD;

    return {
      yaw,
      pitch,
      roll,
      isLookingAway,
    };
  } catch (error) {
    console.error('[Face Detection] Error detecting head pose:', error);
    return {
      yaw: 0,
      pitch: 0,
      roll: 0,
      isLookingAway: false,
    };
  }
}

/**
 * Compare two face descriptors using cosine similarity
 */
export function compareFaces(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[]
): FaceMatchResult {
  try {
    // Convert to arrays if needed
    const d1 = Array.isArray(descriptor1) ? descriptor1 : Array.from(descriptor1);
    const d2 = Array.isArray(descriptor2) ? descriptor2 : Array.from(descriptor2);

    if (d1.length !== d2.length) {
      return {
        similarity: 0,
        isMatch: false,
        isFaceChanged: true,
      };
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < d1.length; i++) {
      dotProduct += d1[i] * d2[i];
      norm1 += d1[i] * d1[i];
      norm2 += d2[i] * d2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    
    // Threshold for face matching (0.65 = 65% similarity)
    const SIMILARITY_THRESHOLD = 0.65;
    const isMatch = similarity >= SIMILARITY_THRESHOLD;
    const isFaceChanged = !isMatch;

    return {
      similarity: Math.max(0, Math.min(1, similarity)), // Clamp to 0-1
      isMatch,
      isFaceChanged,
    };
  } catch (error) {
    console.error('[Face Detection] Error comparing faces:', error);
    return {
      similarity: 0,
      isMatch: false,
      isFaceChanged: true,
    };
  }
}

/**
 * Extract face descriptor (embedding) for storage
 */
export function extractFaceDescriptor(face: FaceDetectionResult['faces'][0]): number[] | null {
  if (!face.descriptor) {
    return null;
  }
  return Array.from(face.descriptor);
}

/**
 * Full face analysis: detection + head pose + comparison
 */
export interface FaceAnalysisResult {
  detection: FaceDetectionResult;
  headPose?: HeadPoseResult;
  faceMatch?: FaceMatchResult;
  violations: Array<{
    type: 'NO_FACE_DETECTED' | 'MULTIPLE_FACES' | 'FACE_CHANGED' | 'LOOKING_AWAY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
  }>;
}

export async function analyzeFace(
  imageBuffer: Buffer,
  baselineDescriptor?: number[] | Float32Array
): Promise<FaceAnalysisResult> {
  const detection = await detectFaces(imageBuffer);
  const violations: FaceAnalysisResult['violations'] = [];

  // Check for no face
  if (!detection.hasFace) {
    violations.push({
      type: 'NO_FACE_DETECTED',
      severity: 'MEDIUM',
      description: 'No face detected in webcam snapshot',
    });
  }

  // Check for multiple faces
  if (detection.hasMultipleFaces) {
    violations.push({
      type: 'MULTIPLE_FACES',
      severity: 'HIGH',
      description: `Multiple faces detected (${detection.faceCount} faces)`,
    });
  }

  let headPose: HeadPoseResult | undefined;
  let faceMatch: FaceMatchResult | undefined;

  // If face detected, analyze further
  if (detection.hasFace && detection.faces.length > 0) {
    const primaryFace = detection.faces[0];

    // Head pose detection
    if (primaryFace.landmarks) {
      headPose = detectHeadPose(primaryFace.landmarks);
      
      if (headPose.isLookingAway) {
        violations.push({
          type: 'LOOKING_AWAY',
          severity: 'MEDIUM',
          description: `Head pose indicates looking away (yaw: ${headPose.yaw.toFixed(1)}°, pitch: ${headPose.pitch.toFixed(1)}°)`,
        });
      }
    }

    // Face matching (if baseline provided)
    if (baselineDescriptor && primaryFace.descriptor) {
      faceMatch = compareFaces(baselineDescriptor, primaryFace.descriptor);
      
      if (faceMatch.isFaceChanged) {
        violations.push({
          type: 'FACE_CHANGED',
          severity: 'HIGH',
          description: `Face changed detected (similarity: ${(faceMatch.similarity * 100).toFixed(1)}%)`,
        });
      }
    }
  }

  return {
    detection,
    headPose,
    faceMatch,
    violations,
  };
}

