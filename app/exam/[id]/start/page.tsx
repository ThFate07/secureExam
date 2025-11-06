"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { CheckCircle, AlertTriangle, Camera, ArrowLeft, Play } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../lib/api/client";

interface SetupExamQuestion {
  id: string;
  points: number;
}

const normalizeExamQuestions = (examData: unknown): SetupExamQuestion[] => {
  if (!examData || typeof examData !== "object") {
    return [];
  }

  const data = examData as Record<string, unknown>;

  if (Array.isArray(data.questions)) {
    return data.questions
      .map((q) => {
        if (q && typeof q === "object") {
          const question = q as Record<string, unknown>;
          return {
            id: String(question.id ?? ""),
            points: typeof question.points === "number" ? question.points : Number(question.points) || 0,
          };
        }
        return { id: "", points: 0 };
      })
      .filter((q) => q.id);
  }

  if (Array.isArray(data.examQuestions)) {
    return data.examQuestions
      .map((eq) => {
        if (eq && typeof eq === "object") {
          const examQuestion = eq as Record<string, unknown>;
          const nestedQuestion = examQuestion.question as Record<string, unknown> | undefined;

          const id = nestedQuestion?.id ?? examQuestion.id ?? "";
          const pointsValue = nestedQuestion?.points ?? examQuestion.points ?? 0;

          return {
            id: String(id),
            points: typeof pointsValue === "number" ? pointsValue : Number(pointsValue) || 0,
          };
        }
        return { id: "", points: 0 };
      })
      .filter((q) => q.id);
  }

  return [];
};

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
  interface ExamData {
    id: string;
    title: string;
    description: string;
    duration: number;
    totalQuestions: number;
    questions: SetupExamQuestion[];
    settings?: ExamSecuritySettings;
  }
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Determine what's actually required based on exam settings
  const requiresCamera = exam?.settings?.requireWebcam ?? false;
  const requiresFullscreen = exam?.settings?.enableFullscreenMode ?? false;

  useEffect(() => {
    // Fetch exam from API (without correct answers for security)
    const fetchExam = async () => {
      try {
        setLoading(true);
        const examData = await api.exams.get(examId);
        
        if (examData) {
          const normalizedQuestions = normalizeExamQuestions(examData);

          setExam({
            id: examData.id,
            title: examData.title,
            description: examData.description || "",
            duration: examData.duration,
            totalQuestions: normalizedQuestions.length,
            questions: normalizedQuestions,
            settings: (examData.settings && typeof examData.settings === "object") ? examData.settings : {},
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
    setIsReady(cameraReady && fullscreenReady);
  }, [cameraPermission, fullscreenSupported, requiresCamera, requiresFullscreen]);

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
                <span className="font-medium">Total Points:</span> {exam.questions.reduce((sum, q) => sum + q.points, 0)}
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
        {((requiresCamera && !cameraPermission) || (requiresFullscreen && !fullscreenSupported)) && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {requiresCamera && !cameraPermission && "Camera access is required for this exam. Please allow camera permissions and refresh the page. "}
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
            {isReady ? "Start Exam" : "Complete Setup Required"}
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