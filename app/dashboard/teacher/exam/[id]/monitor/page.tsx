"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../../../../hooks/useAuth";
import { MonitoringData } from "../../../../../types";
import { subscribeMonitoringEvents, type MonitoringEvent, joinExamAsTeacher } from "../../../../../lib/monitoringWebSocket";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ExamSpecificMonitor() {
  const { id } = useParams();
  const examId = id as string;
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<MonitoringData[]>([]);

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'teacher')) {
      router.push('/auth');
      return;
    }
    // Join monitoring for this specific exam
    if (isAuthenticated && user?.role === 'teacher' && examId) {
      joinExamAsTeacher(examId);
    }
    const unsub = subscribeMonitoringEvents((ev: MonitoringEvent) => {
      if (ev.payload.examId !== examId) return;
      setStudents(prev => {
        const list = [...prev];
        const idx = list.findIndex(s => s.examId === ev.payload.examId && s.studentId === ev.payload.studentId);
        if (idx === -1) {
          list.push({
            studentId: ev.payload.studentId,
            examId: ev.payload.examId,
            attemptId: `${ev.payload.examId}-${ev.payload.studentId}`,
            isActive: true,
            lastActivity: new Date(ev.payload.timestamp),
            webcamEnabled: false,
            currentQuestion: 1,
            flaggedActivities: [],
            warningsCount: 0,
          });
          return list;
        }
        const rec = { ...list[idx] };
        rec.lastActivity = new Date(ev.payload.timestamp);
        if (ev.type === 'heartbeat') {
          const p = ev.payload as { questionIndex: number; webcamActive: boolean };
          rec.currentQuestion = (p.questionIndex ?? 0) + 1;
          rec.webcamEnabled = !!p.webcamActive;
        } else if (ev.type === 'question') {
          const p = ev.payload as { questionIndex: number };
          rec.currentQuestion = (p.questionIndex ?? 0) + 1;
        } else if (ev.type === 'webcam') {
          const p = ev.payload as { webcamActive: boolean };
          rec.webcamEnabled = !!p.webcamActive;
        } else if (ev.type === 'violation') {
          const p = ev.payload as { description: string; severity: 'low' | 'medium' | 'high'; timestamp: number };
          rec.flaggedActivities = [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              type: 'suspicious-behavior' as const,
              timestamp: new Date(p.timestamp),
              description: p.description,
              severity: p.severity,
            },
            ...rec.flaggedActivities,
          ].slice(0, 50);
          rec.warningsCount += 1;
        }
        list[idx] = rec;
        return list;
      });
    });
    return () => unsub();
  }, [examId, loading, isAuthenticated, user, router]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isAuthenticated || user?.role !== 'teacher') return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Monitor Exam #{examId}</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard/teacher')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active Students</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 && (
            <p className="text-sm text-gray-500">No activity yet for this exam.</p>
          )}
          <div className="space-y-3">
            {students.map(s => (
              <div key={s.studentId} className="border rounded p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <div className="font-medium">{s.studentId}</div>
                    <div className="text-xs text-gray-500">Q{ s.currentQuestion } • { s.lastActivity.toLocaleTimeString() }</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {s.webcamEnabled && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Webcam</span>}
                  {s.warningsCount > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{s.warningsCount} warn</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
