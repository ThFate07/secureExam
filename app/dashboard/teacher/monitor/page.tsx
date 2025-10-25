"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { 
  Eye, 
  Users, 
  AlertTriangle, 
  MessageCircle, 
  Camera, 
  Flag,
  Activity,
  Shield,
  Wifi,
  WifiOff
} from "lucide-react";
import { MonitoringData, FlaggedActivity } from "../../../types";
import { 
  subscribeMonitoringEvents, 
  subscribeStudentJoined,
  subscribeStudentLeft,
  subscribeStudentInactive,
  subscribeActiveStudents,
  joinExamAsTeacher,
  disconnectMonitoring,
  sendMessageToStudent,
  isMonitoringConnected,
  type MonitoringEvent 
} from "../../../lib/monitoringWebSocket";
import { api } from "../../../lib/api/client";

export default function TeacherMonitoringDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [activeStudents, setActiveStudents] = useState<MonitoringData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<MonitoringData | null>(null);
  const [message, setMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const handleIncomingEvent = useCallback((event: MonitoringEvent) => {
    if (!event || !event.type || !event.payload) {
      return;
    }
    
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
        // Keep warningsCount consistent with the number of recorded violations
        rec.warningsCount = rec.flaggedActivities.length;
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

    if (!isAuthenticated || user?.role !== 'teacher') return;

    // Subscribe to monitoring events FIRST (before joining)
    const unsubMonitoring = subscribeMonitoringEvents(handleIncomingEvent);

    // Subscribe to active students list
    const unsubActiveStudents = subscribeActiveStudents((students) => {
      // Initialize student records from active students list
      setActiveStudents(prev => {
        const newStudents = [...prev];
        students.forEach(s => {
          const idx = newStudents.findIndex(existing => 
            existing.studentId === s.studentId && existing.examId === s.examId
          );
          const exists = idx !== -1 ? newStudents[idx] : undefined;
          if (!exists) {
            // If server provides prior violations, hydrate flaggedActivities and warningsCount
            const serverViolations = Array.isArray(s.violations) ? s.violations : [];
            const hydratedActivities: FlaggedActivity[] = serverViolations.map(v => ({
              id: `${s.examId}-${s.studentId}-${v.timestamp}`,
              type: inferActivityType(v.description),
              timestamp: new Date(v.timestamp),
              description: v.description,
              severity: v.severity,
            }));

            newStudents.push({
              studentId: s.studentId,
              examId: s.examId,
              attemptId: `${s.examId}-${s.studentId}`,
              isActive: true,
              lastActivity: new Date(s.lastActivity),
              webcamEnabled: false,
              currentQuestion: 1,
              flaggedActivities: hydratedActivities,
              warningsCount: hydratedActivities.length,
            });

            // Fallback: if server didn't include violations, fetch from API to hydrate
            if (hydratedActivities.length === 0) {
              (async () => {
                try {
                  const res = await fetch(`/api/monitor/events?examId=${s.examId}&studentId=${s.studentId}`);
                  const data = await res.json();
                  if (data?.success && Array.isArray(data.data?.events)) {
                    const events = data.data.events as Array<{ description: string; timestamp: string; severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL' }>;
                    const acts: FlaggedActivity[] = events.slice(0, 50).map(e => ({
                      id: `${s.examId}-${s.studentId}-${e.timestamp}`,
                      type: inferActivityType(e.description),
                      timestamp: new Date(e.timestamp),
                      description: e.description,
                      severity: e.severity.toLowerCase() as 'low'|'medium'|'high',
                    }));
                    if (acts.length > 0) {
                      setActiveStudents(cur => cur.map(stu =>
                        stu.studentId === s.studentId && stu.examId === s.examId
                          ? { ...stu, flaggedActivities: acts, warningsCount: acts.length }
                          : stu
                      ));
                    }
                  }
                } catch {
                  // best-effort only
                }
              })();
            }
          }
          else {
            // Merge in server-provided violations if present
            const serverViolations = Array.isArray(s.violations) ? s.violations : [];
            if (serverViolations.length > 0) {
              const hydratedActivities: FlaggedActivity[] = serverViolations.map(v => ({
                id: `${s.examId}-${s.studentId}-${v.timestamp}`,
                type: inferActivityType(v.description),
                timestamp: new Date(v.timestamp),
                description: v.description,
                severity: v.severity,
              }));
              const merged = { ...exists, flaggedActivities: hydratedActivities, warningsCount: hydratedActivities.length };
              newStudents[idx] = merged;
            } else {
              // Server didn't include any; try REST fallback to hydrate existing record
              (async () => {
                try {
                  const res = await fetch(`/api/monitor/events?examId=${s.examId}&studentId=${s.studentId}`);
                  const data = await res.json();
                  if (data?.success && Array.isArray(data.data?.events)) {
                    const events = data.data.events as Array<{ description: string; timestamp: string; severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL' }>;
                    const acts: FlaggedActivity[] = events.slice(0, 50).map(e => ({
                      id: `${s.examId}-${s.studentId}-${e.timestamp}`,
                      type: inferActivityType(e.description),
                      timestamp: new Date(e.timestamp),
                      description: e.description,
                      severity: e.severity.toLowerCase() as 'low'|'medium'|'high',
                    }));
                    if (acts.length > 0) {
                      setActiveStudents(cur => cur.map(stu =>
                        stu.studentId === s.studentId && stu.examId === s.examId
                          ? { ...stu, flaggedActivities: acts, warningsCount: acts.length }
                          : stu
                      ));
                    }
                  }
                } catch {
                  // best-effort only
                }
              })();
            }
          }
        });
        return newStudents;
      });
    });

    // Subscribe to student join events
    const unsubJoined = subscribeStudentJoined(() => {
      // Student will send heartbeat immediately, so we don't need to create entry here
    });

    // Subscribe to student leave events
    const unsubLeft = subscribeStudentLeft((event) => {
      // Remove only the specific student's record for the exam they left
      setActiveStudents(prev => prev.filter(s => !(s.studentId === event.studentId && s.examId === event.examId)));
    });

    // Subscribe to student inactive events
    const unsubInactive = subscribeStudentInactive((event) => {
      setActiveStudents(prev => prev.map(s => 
        s.studentId === event.studentId && s.examId === event.examId ? { ...s, isActive: false } : s
      ));
    });

    // THEN join exam monitoring as teacher via WebSocket (after all subscriptions are set up)
    joinExamAsTeacher();

    // Update connection status
    const checkConnection = setInterval(() => {
      setIsConnected(isMonitoringConnected());
    }, 1000);

    return () => {
      clearInterval(checkConnection);
      unsubMonitoring();
      unsubActiveStudents();
      unsubJoined();
      unsubLeft();
      unsubInactive();
      disconnectMonitoring();
    };
  }, [user, isAuthenticated, loading, router, handleIncomingEvent]);


  const inferActivityType = (desc: string): FlaggedActivity['type'] => {
    if (/copy|paste/i.test(desc)) return 'copy-paste';
    if (/fullscreen/i.test(desc)) return 'fullscreen-exit';
    if (/right-click/i.test(desc)) return 'right-click';
    if (/blur|focus|switch/i.test(desc)) return 'tab-switch';
    return 'suspicious-behavior';
  };

  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [examTotals, setExamTotals] = useState<Record<string, number>>({});

  // Fetch student names when needed
  useEffect(() => {
    const uniqueStudentIds = [...new Set(activeStudents.map(s => s.studentId))];
    const missingIds = uniqueStudentIds.filter(id => !studentNames[id]);
    
    if (missingIds.length > 0) {
      // In a real implementation, you would fetch from /api/users or similar
      // For now, we'll set the IDs as names
      const newNames = { ...studentNames };
      missingIds.forEach(id => {
        newNames[id] = `Student ${id.slice(0, 8)}`;
      });
      setStudentNames(newNames);
    }
  }, [activeStudents, studentNames]);

  // Fetch total questions per exam when needed
  useEffect(() => {
    const uniqueExamIds = [...new Set(activeStudents.map(s => s.examId))];
    const missingExamIds = uniqueExamIds.filter(id => examTotals[id] === undefined);

    if (missingExamIds.length === 0) return;

    // Fetch totals in parallel and merge
    (async () => {
      try {
        const results = await Promise.allSettled(
          missingExamIds.map(async (examId) => {
            const exam = await api.exams.get(examId);
            // examQuestions comes from API include; fallback to questions if shape differs
            const total = Array.isArray(exam?.examQuestions)
              ? exam.examQuestions.length
              : Array.isArray(exam?.questions)
                ? exam.questions.length
                : 0;
            return { examId, total };
          })
        );

        const next: Record<string, number> = {};
        for (const r of results) {
          if (r.status === 'fulfilled') {
            next[r.value.examId] = r.value.total;
          }
        }
        if (Object.keys(next).length > 0) {
          setExamTotals(prev => ({ ...prev, ...next }));
        }
      } catch (err) {
        console.error('Failed to load exam totals', err);
      }
    })();
  }, [activeStudents, examTotals]);

  const getStudentName = (studentId: string) => {
    return studentNames[studentId] || `Student ${studentId.slice(0, 8)}`;
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
    
    // Get the examId from the selected student
    if (!selectedStudent) return;
    
    // Send message via WebSocket
    sendMessageToStudent(studentId, selectedStudent.examId, message);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Real-time Monitoring Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor student activities during the examination in real-time.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <Wifi className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-600 font-medium">Disconnected</span>
              </>
            )}
          </div>
        </div>
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
                    key={student.attemptId}
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
                      <div>
                        {selectedStudent.currentQuestion}
                        {examTotals[selectedStudent.examId] !== undefined && (
                          <>/{examTotals[selectedStudent.examId]}</>
                        )}
                      </div>
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