"use client";

/**
 * Face Detection Demo Page
 * Showcase page for demonstrating AI-based face detection capabilities
 * Does not count or store violations - purely for demonstration
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Camera, Activity, ArrowLeft, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useWebcam } from "../../hooks/useExam";
import { useFaceDetection } from "../../hooks/useFaceDetection";

export default function FaceDetectionDemoPage() {
  const router = useRouter();
  const [videoElementForDetection, setVideoElementForDetection] = useState<HTMLVideoElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const [violations, setViolations] = useState<Array<{ type: string; description: string; timestamp: Date }>>([]);
  const [stats, setStats] = useState({
    totalDetections: 0,
    facesDetected: 0,
    violationsDetected: 0,
    startTime: new Date(),
  });

  const webcam = useWebcam({
    enabled: true,
    onError: (error) => {
      console.error('Webcam error:', error);
    },
  });

  const faceDetection = useFaceDetection({
    enabled: true,
    videoElement: videoElementForDetection || undefined,
    onDetection: (result) => {
      setStats(prev => ({
        ...prev,
        totalDetections: prev.totalDetections + 1,
        facesDetected: result.hasFace ? prev.facesDetected + 1 : prev.facesDetected,
      }));
    },
    onViolation: (type, description) => {
      // Just show violations, don't store or count them
      const violation = {
        type,
        description,
        timestamp: new Date(),
      };
      setViolations(prev => [violation, ...prev].slice(0, 20)); // Keep last 20
      setStats(prev => ({
        ...prev,
        violationsDetected: prev.violationsDetected + 1,
      }));
    },
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  const getViolationColor = (type: string) => {
    if (type === 'MULTIPLE_FACES' || type === 'FACE_CHANGED') return 'bg-red-100 text-red-800 border-red-300';
    if (type === 'NO_FACE_DETECTED') return 'bg-orange-100 text-orange-800 border-orange-300';
    if (type === 'LOOKING_AWAY') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold mb-2">AI Face Detection Demo</h1>
            <p className="text-gray-600">
              Real-time demonstration of AI-powered face detection and violation monitoring
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              ⚠️ This is a demo page - violations are not counted or stored
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="h-5 w-5" />
                  <span>Live Camera Feed</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {webcam.isActive && webcam.stream ? (
                  <div className="relative">
                    <video
                      autoPlay
                      muted
                      playsInline
                      className="w-full rounded border-2 border-gray-300"
                      ref={(video) => {
                        videoElementRef.current = video;
                        if (video && webcam.stream) {
                          setVideoElementForDetection(video);
                          if (video.srcObject !== webcam.stream) {
                            video.srcObject = webcam.stream;
                            video.play().catch(() => {});
                          }
                        }
                      }}
                    />
                    {/* Detection Overlay */}
                    {faceDetection.lastDetection && (
                      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-sm space-y-1">
                        <div className="flex items-center space-x-2">
                          <span>Faces:</span>
                          <span className={`font-bold ${
                            faceDetection.lastDetection.faceCount === 1 ? 'text-green-400' :
                            faceDetection.lastDetection.faceCount === 0 ? 'text-red-400' :
                            'text-orange-400'
                          }`}>
                            {faceDetection.lastDetection.faceCount}
                          </span>
                        </div>
                        {faceDetection.lastDetection.confidence > 0 && (
                          <div className="flex items-center space-x-2">
                            <span>Confidence:</span>
                            <span className="font-bold">
                              {(faceDetection.lastDetection.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded border flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Camera className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Violations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span>Detected Violations (Demo Only)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {violations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No violations detected</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {violations.map((violation, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${getViolationColor(violation.type)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-sm mb-1">
                              {violation.type.replace(/_/g, ' ')}
                            </div>
                            <div className="text-xs opacity-90">
                              {violation.description}
                            </div>
                          </div>
                          <div className="text-xs opacity-70 ml-2">
                            {formatTime(violation.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats and Debug Panel */}
          <div className="space-y-6">
            {/* Detection Status */}
            <Card className="border-2 border-blue-400 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2 text-blue-800">
                  <Activity className="h-5 w-5" />
                  <span>Detection Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <div className="mt-4 p-3 bg-white rounded border border-blue-300">
                    <h4 className="font-semibold text-sm mb-2 text-gray-800">Latest Detection:</h4>
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
                                Math.abs(faceDetection.lastDetection.headPose.yaw) > 45
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {faceDetection.lastDetection.headPose.yaw.toFixed(1)}°
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Pitch (Up/Down):</span>
                              <span className={`font-medium px-2 py-1 rounded text-xs ${
                                Math.abs(faceDetection.lastDetection.headPose.pitch) > 35
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
                      Waiting for face detection... (runs every 1 second)
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

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Detections:</span>
                  <span className="font-semibold">{stats.totalDetections}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Faces Detected:</span>
                  <span className="font-semibold text-green-600">{stats.facesDetected}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Violations Detected:</span>
                  <span className="font-semibold text-red-600">{stats.violationsDetected}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Session Duration:</span>
                  <span className="font-semibold">
                    {Math.floor((Date.now() - stats.startTime.getTime()) / 1000)}s
                  </span>
                </div>
                <div className="pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViolations([]);
                      setStats({
                        totalDetections: 0,
                        facesDetected: 0,
                        violationsDetected: 0,
                        startTime: new Date(),
                      });
                    }}
                    className="w-full"
                  >
                    Reset Statistics
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Scenarios */}
            <Card>
              <CardHeader>
                <CardTitle>Test Scenarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="font-medium text-blue-900 mb-1">1. No Face Detection</div>
                  <div className="text-xs text-blue-700">Move out of frame or cover your face</div>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="font-medium text-blue-900 mb-1">2. Multiple Faces</div>
                  <div className="text-xs text-blue-700">Have someone else join you in frame</div>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="font-medium text-blue-900 mb-1">3. Looking Away</div>
                  <div className="text-xs text-blue-700">Turn your head left, right, up, or down</div>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="font-medium text-blue-900 mb-1">4. Normal Position</div>
                  <div className="text-xs text-blue-700">Face forward - should show green status</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

