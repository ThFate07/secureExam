"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { CheckCircle, AlertTriangle, Camera, ArrowLeft, Play, Activity } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../lib/api/client";
import { useWebcam } from "../../../hooks/useExam";
import { useFaceDetection } from "../../../hooks/useFaceDetection";

export default function StartExamPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const examId = params.id as string;
  
  interface ExamSecuritySettings {
    requireWebcam?: boolean;
    enableFullscreenMode?: boolean;
    preventTabSwitching?: boolean;
    [key: string]: unknown;
  }
  interface ExamQuestion { id: string; points: number; [k: string]: unknown }
  interface ExamData { id: string; title: string; description: string; duration: number; totalQuestions: number; questions: ExamQuestion[]; settings?: ExamSecuritySettings }
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [faceCalibrated, setFaceCalibrated] = useState(false);
  const [faceCalibrationStatus, setFaceCalibrationStatus] = useState<{
    faceDetected: boolean;
    faceCount: number;
    confidence: number;
    message: string;
  }>({
    faceDetected: false,
    faceCount: 0,
    confidence: 0,
    message: 'Position yourself in front of the camera',
  });
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const [videoElementForDetection, setVideoElementForDetection] = useState<HTMLVideoElement | null>(null);
  
  // Determine what's actually required based on exam settings
  const requiresCamera = exam?.settings?.requireWebcam ?? false;
  const requiresFullscreen = exam?.settings?.enableFullscreenMode ?? false;

  // Setup webcam for calibration
  const webcam = useWebcam({
    enabled: requiresCamera,
    onError: (error) => {
      setFaceCalibrationStatus({
        faceDetected: false,
        faceCount: 0,
        confidence: 0,
        message: `Camera error: ${error}`,
      });
    },
  });

  // Face detection for calibration
  const faceDetection = useFaceDetection({
    enabled: requiresCamera && cameraPermission === true,
    videoElement: videoElementForDetection || undefined,
    onDetection: (result) => {
      if (result.hasFace && result.faceCount === 1 && result.confidence > 0.7) {
        setFaceCalibrationStatus({
          faceDetected: true,
          faceCount: result.faceCount,
          confidence: result.confidence,
          message: 'Face detected! You\'re ready to start.',
        });
        // Auto-calibrate after 2 seconds of good detection
        if (!faceCalibrated) {
          setTimeout(() => {
            setFaceCalibrated(true);
          }, 2000);
        }
      } else if (result.faceCount === 0) {
        setFaceCalibrationStatus({
          faceDetected: false,
          faceCount: 0,
          confidence: 0,
          message: 'No face detected. Please position yourself in front of the camera.',
        });
        setFaceCalibrated(false);
      } else if (result.hasMultipleFaces) {
        setFaceCalibrationStatus({
          faceDetected: false,
          faceCount: result.faceCount,
          confidence: result.confidence,
          message: `Multiple faces detected (${result.faceCount}). Please ensure only you are visible.`,
        });
        setFaceCalibrated(false);
      } else {
        setFaceCalibrationStatus({
          faceDetected: false,
          faceCount: result.faceCount,
          confidence: result.confidence || 0,
          message: 'Face detection in progress...',
        });
        setFaceCalibrated(false);
      }
    },
  });

  useEffect(() => {
    // Fetch exam from API (without correct answers for security)
    const fetchExam = async () => {
      try {
        setLoading(true);
        const examData = await api.exams.get(examId);
        
        if (examData) {
          // Handle both examQuestions (from /api/exams/[id]) and questions (from /api/exams/[id]/start)
          const questions = examData.examQuestions 
            ? examData.examQuestions.map((eq: { question: ExamQuestion; order: number }) => ({
                id: eq.question.id,
                points: eq.question.points
              }))
            : examData.questions?.map((q: ExamQuestion) => ({ 
                id: q.id, 
                points: q.points 
              })) || [];
          
          setExam({
            id: examData.id,
            title: examData.title,
            description: examData.description || '',
            duration: examData.duration,
            totalQuestions: questions.length,
            questions: questions,
            settings: examData.settings || {}
          });
        } else {
          setError('Exam not found');
        }
      } catch (err) {
        console.error('Failed to fetch exam:', err);
        setError(err instanceof Error ? err.message : 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  // Check requirements based on exam settings
  useEffect(() => {
    if (!exam?.settings) return;

    // Check fullscreen support if required
    if (requiresFullscreen) {
      setFullscreenSupported(!!document.documentElement.requestFullscreen);
    } else {
      setFullscreenSupported(true); // Not required, so mark as supported
    }

    // Check camera permission if required
    if (requiresCamera) {
      checkCameraPermission();
    } else {
      setCameraPermission(true); // Not required, so mark as granted
    }
  }, [exam, requiresCamera, requiresFullscreen]);

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraPermission(true);
      stream.getTracks().forEach(track => track.stop()); // Stop the stream
    } catch {
      setCameraPermission(false);
    }
  };

  const startExam = async () => {
    try {
      // Enter fullscreen mode only if required and supported
      if (requiresFullscreen && fullscreenSupported) {
        await document.documentElement.requestFullscreen();
      }
      
      // Navigate to the actual exam
      router.push(`/exam/${examId}`);
    } catch {
      console.error("Failed to start exam");
    }
  };

  useEffect(() => {
    // Check if all requirements are met based on what's actually required
    const cameraReady = !requiresCamera || cameraPermission === true;
    const fullscreenReady = !requiresFullscreen || fullscreenSupported;
    const faceReady = !requiresCamera || faceCalibrated;
    setIsReady(cameraReady && fullscreenReady && faceReady);
  }, [cameraPermission, fullscreenSupported, requiresCamera, requiresFullscreen, faceCalibrated]);

  if (loading || !exam) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    // Exam not found
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error || 'Exam not found.'}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/student")}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/student")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mb-2">Exam Setup</h1>
          <p className="text-gray-600">Please complete the setup before starting your exam</p>
        </div>

        {/* Exam Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{exam.title}</CardTitle>
            <CardDescription>{exam.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Duration:</span> {exam.duration} minutes
              </div>
              <div>
                <span className="font-medium">Questions:</span> {exam.totalQuestions}
              </div>
              <div>
                <span className="font-medium">Total Points:</span> {exam.questions.reduce((sum: number, q: ExamQuestion) => sum + q.points, 0)}
              </div>
              <div>
                <span className="font-medium">Student:</span> {user?.name}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Requirements Check - Only show if there are actual requirements */}
        {(requiresCamera || requiresFullscreen) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>System Requirements</CardTitle>
              <CardDescription>
                All requirements must be met before you can start the exam
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera Permission - Only show if required */}
              {requiresCamera && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <Camera className="w-5 h-5 mr-3 text-gray-600" />
                    <div>
                      <p className="font-medium">Camera Access</p>
                      <p className="text-sm text-gray-600">Required for proctoring</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {cameraPermission === true ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : cameraPermission === false ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    )}
                  </div>
                </div>
              )}

              {/* Face Detection Calibration - Only show if camera is required and permission granted */}
              {requiresCamera && cameraPermission === true && (
                <Card className="mt-4 border-2 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Face Detection Setup</span>
                    </CardTitle>
                    <CardDescription>
                      Position yourself in front of the camera to calibrate face detection
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Video Feed */}
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
                        {/* Overlay status */}
                        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-sm">
                          {faceCalibrated ? (
                            <span className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-400" />
                              <span>Calibrated</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1">
                              <Activity className="h-4 w-4 animate-pulse text-yellow-400" />
                              <span>Calibrating...</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-100 rounded border flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <Camera className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Starting camera...</p>
                        </div>
                      </div>
                    )}

                    {/* Detection Status */}
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <span className={`text-sm font-semibold ${
                          faceCalibrated ? 'text-green-600' : 
                          faceCalibrationStatus.faceDetected ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {faceCalibrationStatus.message}
                        </span>
                      </div>
                      {faceDetection.lastDetection && (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Faces:</span>
                            <span className={`ml-1 font-medium ${
                              faceDetection.lastDetection.faceCount === 1 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {faceDetection.lastDetection.faceCount}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Confidence:</span>
                            <span className="ml-1 font-medium">
                              {(faceDetection.lastDetection.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Ready:</span>
                            <span className={`ml-1 font-medium ${faceCalibrated ? 'text-green-600' : 'text-gray-400'}`}>
                              {faceCalibrated ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      )}
                      {!faceDetection.isReady && (
                        <div className="text-xs text-yellow-600">
                          Loading face detection models... Please wait.
                        </div>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium mb-2">Setup Instructions:</p>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Sit directly in front of your camera</li>
                        <li>Ensure your face is well-lit</li>
                        <li>Remove any masks or face coverings</li>
                        <li>Make sure only you are visible in the frame</li>
                        <li>Wait for "Calibrated" status before starting</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fullscreen Support - Only show if required */}
              {requiresFullscreen && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <div className="w-5 h-5 mr-3 border border-gray-400 rounded bg-gray-100"></div>
                    <div>
                      <p className="font-medium">Fullscreen Mode</p>
                      <p className="text-sm text-gray-600">Browser must support fullscreen</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {fullscreenSupported ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Exam Rules */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exam Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {requiresFullscreen && (
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  You must remain in fullscreen mode throughout the exam
                </li>
              )}
              {requiresCamera && (
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Your camera will record you during the entire exam
                </li>
              )}
              {exam?.settings?.preventTabSwitching && (
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Switching tabs or windows is not allowed and will be flagged
                </li>
              )}
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                The exam will auto-submit when time expires
              </li>
              {!requiresFullscreen && !requiresCamera && !exam?.settings?.preventTabSwitching && (
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Complete all questions to the best of your ability
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Warnings - Only show if requirements are not met */}
        {((requiresCamera && (!cameraPermission || !faceCalibrated)) || (requiresFullscreen && !fullscreenSupported)) && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {requiresCamera && !cameraPermission && "Camera access is required for this exam. Please allow camera permissions and refresh the page. "}
              {requiresCamera && cameraPermission && !faceCalibrated && "Please complete face detection calibration above before starting the exam. "}
              {requiresFullscreen && !fullscreenSupported && "Your browser does not support fullscreen mode. Please use a modern browser like Chrome, Firefox, or Safari."}
            </AlertDescription>
          </Alert>
        )}

        {/* Start Button */}
        <div className="flex justify-center">
          <Button
            onClick={startExam}
            disabled={!isReady}
            size="lg"
            className={`px-8 py-3 ${
              isReady 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            <Play className="w-5 h-5 mr-2" />
            {isReady ? "Start Exam" : requiresCamera && !faceCalibrated ? "Complete Face Calibration" : "Complete Setup Required"}
          </Button>
        </div>

        {isReady && (
          <p className="text-center text-sm text-gray-600 mt-4">
            Click &quot;Start Exam&quot; to begin. The exam will start in fullscreen mode.
          </p>
        )}
      </div>
    </div>
  );
}