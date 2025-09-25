"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
// import { Alert, AlertDescription } from "../../../components/ui/alert"; // currently unused
import { 
  Eye, 
  Users, 
  AlertTriangle, 
  MessageCircle, 
  Camera, 
  Clock,
  Flag,
  Activity,
  Shield
} from "lucide-react";
import { MonitoringData, FlaggedActivity } from "../../../types";
import { subscribeMonitoringEvents, MonitoringEvent } from "../../../lib/monitoringChannel";

export default function TeacherMonitoringDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [activeStudents, setActiveStudents] = useState<MonitoringData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<MonitoringData | null>(null);
  const [message, setMessage] = useState("");
  const unsubRef = useRef<(() => void) | null>(null);
  const demoSeededRef = useRef(false);

  const handleIncomingEvent = useCallback((event: MonitoringEvent) => {
    setActiveStudents(prev => {
      const list = [...prev];
      const { type, payload } = event;
      const key = `${payload.examId}-${payload.studentId}`;
      let recordIndex = list.findIndex(s => s.examId === payload.examId && s.studentId === payload.studentId);
      if (recordIndex === -1) {
        list.push({
          studentId: payload.studentId,
          examId: payload.examId,
          attemptId: key,
          isActive: true,
          lastActivity: new Date(payload.timestamp),
          webcamEnabled: false,
          currentQuestion: 1,
          flaggedActivities: [],
          warningsCount: 0,
        });
        recordIndex = list.length - 1;
      }
      const rec = { ...list[recordIndex] };
      rec.lastActivity = new Date(payload.timestamp);
      if (type === 'heartbeat') {
        const p = event.payload as { questionIndex: number; webcamActive: boolean };
        rec.currentQuestion = (p.questionIndex ?? 0) + 1;
        rec.webcamEnabled = !!p.webcamActive;
        rec.isActive = true;
      } else if (type === 'question') {
        const p = event.payload as { questionIndex: number };
        rec.currentQuestion = (p.questionIndex ?? 0) + 1;
      } else if (type === 'webcam') {
        const p = event.payload as { webcamActive: boolean };
        rec.webcamEnabled = !!p.webcamActive;
      } else if (type === 'violation') {
        const p = event.payload as { description: string; severity: 'low' | 'medium' | 'high'; timestamp: number };
        const activity: FlaggedActivity = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: inferActivityType(p.description),
          timestamp: new Date(p.timestamp),
          description: p.description,
          severity: p.severity,
        };
        rec.flaggedActivities = [activity, ...rec.flaggedActivities].slice(0, 50);
        rec.warningsCount += 1;
      }
      list[recordIndex] = rec;
      return list;
    });
  }, []);

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'teacher')) {
      router.push("/auth");
      return;
    }

    // Subscribe to real-time (tab-based) events
    if (!unsubRef.current) {
      unsubRef.current = subscribeMonitoringEvents(handleIncomingEvent);
    }

    // Seed demo data after 800ms if still empty and not already seeded
    const seedTimer = setTimeout(() => {
      if (!demoSeededRef.current && activeStudents.length === 0) {
        demoSeededRef.current = true;
        const now = Date.now();
        const demo: MonitoringData[] = [
          {
            studentId: 'demo_student_1',
            examId: '1',
            attemptId: '1-demo_student_1',
            isActive: true,
            lastActivity: new Date(now - 30_000),
            webcamEnabled: true,
            currentQuestion: 2,
            flaggedActivities: [
              {
                id: 'dflag1',
                type: 'tab-switch',
                timestamp: new Date(now - 60_000),
                description: 'Tab switch detected',
                severity: 'medium',
              },
            ],
            warningsCount: 1,
            isDemo: true,
          },
          {
            studentId: 'demo_student_2',
            examId: '1',
            attemptId: '1-demo_student_2',
            isActive: true,
            lastActivity: new Date(now - 10_000),
            webcamEnabled: false,
            currentQuestion: 4,
            flaggedActivities: [],
            warningsCount: 0,
            isDemo: true,
          },
        ];
        setActiveStudents(demo);
      }
    }, 800);
    
    return () => {
      unsubRef.current?.();
      clearTimeout(seedTimer);
    };
  }, [user, isAuthenticated, loading, router, handleIncomingEvent, activeStudents.length]);


  const inferActivityType = (desc: string): FlaggedActivity['type'] => {
    if (/copy|paste/i.test(desc)) return 'copy-paste';
    if (/fullscreen/i.test(desc)) return 'fullscreen-exit';
    if (/right-click/i.test(desc)) return 'right-click';
    if (/blur|focus|switch/i.test(desc)) return 'tab-switch';
    return 'suspicious-behavior';
  };

  const getStudentName = (studentId: string) => {
    // Mock student names
    const names = {
      student1: "Alice Johnson",
      student2: "Bob Smith",
      student3: "Carol Davis",
    };
    return names[studentId as keyof typeof names] || studentId;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'tab-switch': return <Activity className="h-4 w-4" />;
      case 'window-blur': return <Eye className="h-4 w-4" />;
      case 'copy-paste': return <AlertTriangle className="h-4 w-4" />;
      case 'right-click': return <Shield className="h-4 w-4" />;
      default: return <Flag className="h-4 w-4" />;
    }
  };

  const sendMessage = (studentId: string) => {
    if (!message.trim()) return;
    
    // In real app, this would send message via WebSocket
    console.log(`Sending message to ${studentId}: ${message}`);
    setMessage("");
    alert(`Message sent to ${getStudentName(studentId)}`);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'teacher') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Real-time Monitoring Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor student activities during the examination in real-time.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeStudents.filter(s => s.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently taking exam
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Violations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeStudents.reduce((acc, s) => acc + s.flaggedActivities.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webcam Active</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeStudents.filter(s => s.webcamEnabled).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Students with webcam on
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeStudents.filter(s => s.warningsCount >= 2).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Students with 2+ violations
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Student Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeStudents.length === 0 && (
                  <div className="text-sm text-gray-500 p-4 border rounded bg-gray-50">Waiting for student activity... Ask students to open their exam.</div>
                )}
                {activeStudents.map((student) => (
                  <div
                    key={student.studentId}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedStudent?.studentId === student.studentId
                        ? "bg-blue-50 border-blue-300"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${student.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <h3 className="font-semibold">{getStudentName(student.studentId)}</h3>
                          <p className="text-sm text-gray-500">
                            Question {student.currentQuestion} • Last active: {formatTime(student.lastActivity)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {student.webcamEnabled && <Camera className="h-4 w-4 text-green-600" />}
                        {student.warningsCount > 0 && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            student.warningsCount >= 3 ? 'bg-red-100 text-red-800' :
                            student.warningsCount >= 2 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {student.warningsCount} warnings
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Details */}
        <div>
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Student Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>{getStudentName(selectedStudent.studentId)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-500">Status</label>
                      <div className={`flex items-center space-x-1 ${selectedStudent.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        <div className={`w-2 h-2 rounded-full ${selectedStudent.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span>{selectedStudent.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="font-medium text-gray-500">Question</label>
                      <div>{selectedStudent.currentQuestion}/5</div>
                    </div>
                    
                    <div>
                      <label className="font-medium text-gray-500">Webcam</label>
                      <div className={selectedStudent.webcamEnabled ? 'text-green-600' : 'text-red-600'}>
                        {selectedStudent.webcamEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="font-medium text-gray-500">Warnings</label>
                      <div className={
                        selectedStudent.warningsCount >= 3 ? 'text-red-600' :
                        selectedStudent.warningsCount >= 2 ? 'text-yellow-600' :
                        'text-green-600'
                      }>
                        {selectedStudent.warningsCount}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Webcam Feed */}
              {selectedStudent.webcamEnabled && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Camera className="h-5 w-5" />
                      <span>Live Feed</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-gray-100 rounded border flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Camera className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Live webcam feed would appear here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Flagged Activities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Recent Activities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedStudent.flaggedActivities.length > 0 ? (
                    <div className="space-y-3">
                      {selectedStudent.flaggedActivities.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                          <div className={`p-1 rounded ${getSeverityColor(activity.severity)}`}>
                            {getActivityTypeIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{activity.description}</p>
                            <p className="text-xs text-gray-500">
                              {formatTime(activity.timestamp)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                            {activity.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No violations detected</p>
                  )}
                </CardContent>
              </Card>

              {/* Send Message */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5" />
                    <span>Send Message</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Send a message to the student..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <Button
                      onClick={() => sendMessage(selectedStudent.studentId)}
                      disabled={!message.trim()}
                      className="w-full"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a student to view detailed monitoring information</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}