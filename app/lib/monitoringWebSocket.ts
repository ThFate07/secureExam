"use client";

import { io, Socket } from 'socket.io-client';

// WebSocket-based monitoring system for production use
// Replaces BroadcastChannel with Socket.io for cross-device real-time monitoring

export type MonitoringEvent =
  | { type: 'heartbeat'; payload: HeartbeatPayload }
  | { type: 'violation'; payload: ViolationPayload }
  | { type: 'question'; payload: QuestionChangePayload }
  | { type: 'webcam'; payload: WebcamPayload };

export interface BaseMonitoringPayload {
  studentId: string;
  examId: string;
  timestamp: number;
}

export interface HeartbeatPayload extends BaseMonitoringPayload {
  questionIndex: number;
  webcamActive: boolean;
}

export interface ViolationPayload extends BaseMonitoringPayload {
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface QuestionChangePayload extends BaseMonitoringPayload {
  questionIndex: number;
}

export interface WebcamPayload extends BaseMonitoringPayload {
  webcamActive: boolean;
}

export interface StudentJoinedEvent {
  studentId: string;
  examId: string;
  timestamp: number;
}

export interface StudentLeftEvent {
  studentId: string;
  examId: string;
  timestamp: number;
}

export interface TeacherMessageEvent {
  message: string;
  timestamp: number;
}

let socket: Socket | null = null;

// Initialize WebSocket connection
export function initializeMonitoringSocket(): Socket {
  // Always return existing socket if it exists (even if not connected yet)
  // This prevents creating multiple socket instances
  if (socket) {
    return socket;
  }

  socket = io({
    path: '/api/socket',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('[WebSocket] Connected to monitoring server');
  });

  socket.on('disconnect', () => {
    console.log('[WebSocket] Disconnected from monitoring server');
  });

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] Connection error:', error);
  });

  return socket;
}

// Get existing socket instance
export function getMonitoringSocket(): Socket | null {
  return socket;
}

// Student joins exam monitoring
export function joinExamAsStudent(studentId: string, examId: string) {
  const sock = initializeMonitoringSocket();
  
  const doJoin = () => {
    sock.emit('join-exam', { studentId, examId, role: 'student' });
  };

  // If already connected, join immediately
  if (sock.connected) {
    doJoin();
  } else {
    // Wait for connection before joining
    sock.once('connect', doJoin);
  }
}

// Student leaves exam monitoring
export function leaveExamAsStudent(studentId: string, examId: string) {
  const sock = getMonitoringSocket();
  if (!sock) return;
  const doLeave = () => {
    sock.emit('leave-exam', { studentId, examId });
  };
  if (sock.connected) {
    doLeave();
  } else {
    // If reconnect happens before unload, still send
    sock.once('connect', doLeave);
  }
}

// Teacher joins exam monitoring
export function joinExamAsTeacher(examId?: string) {
  const sock = initializeMonitoringSocket();
  
  const doJoin = () => {
    sock.emit('join-exam', { examId, role: 'teacher' });
  };

  // If already connected, join immediately
  if (sock.connected) {
    doJoin();
  } else {
    // Wait for connection before joining
    sock.once('connect', doJoin);
  }
}

// Send monitoring event (from student)
export function sendMonitoringEvent(event: MonitoringEvent) {
  const sock = getMonitoringSocket();
  if (!sock) {
    const newSock = initializeMonitoringSocket();
    if (!newSock.connected) {
      // Queue the event to be sent when connected
      newSock.once('connect', () => {
        newSock.emit('monitoring-event', event);
      });
      return;
    }
    newSock.emit('monitoring-event', event);
    return;
  }
  
  if (!sock.connected) {
    return;
  }

  sock.emit('monitoring-event', event);
}

// Subscribe to monitoring events (for teacher)
export function subscribeMonitoringEvents(
  onEvent: (event: MonitoringEvent) => void
): () => void {
  const sock = initializeMonitoringSocket();

  const handler = (event: MonitoringEvent) => {
    onEvent(event);
  };

  sock.on('monitoring-event', handler);

  return () => {
    sock.off('monitoring-event', handler);
  };
}

// Subscribe to student join events (for teacher)
export function subscribeStudentJoined(
  onJoined: (event: StudentJoinedEvent) => void
): () => void {
  const sock = initializeMonitoringSocket();

  sock.on('student-joined', onJoined);

  return () => {
    sock.off('student-joined', onJoined);
  };
}

// Subscribe to student leave events (for teacher)
export function subscribeStudentLeft(
  onLeft: (event: StudentLeftEvent) => void
): () => void {
  const sock = initializeMonitoringSocket();

  sock.on('student-left', onLeft);

  return () => {
    sock.off('student-left', onLeft);
  };
}

// Subscribe to student inactive events (for teacher)
export function subscribeStudentInactive(
  onInactive: (event: StudentLeftEvent) => void
): () => void {
  const sock = initializeMonitoringSocket();

  sock.on('student-inactive', onInactive);

  return () => {
    sock.off('student-inactive', onInactive);
  };
}

// Subscribe to active students list (for teacher)
export function subscribeActiveStudents(
  onActiveStudents: (students: Array<{
    studentId: string;
    examId: string;
    lastActivity: number;
    violations?: Array<{ description: string; severity: 'low' | 'medium' | 'high'; timestamp: number }>;
  }>) => void
): () => void {
  const sock = initializeMonitoringSocket();

  const handler = (students: Array<{
    studentId: string;
    examId: string;
    lastActivity: number;
    violations?: Array<{ description: string; severity: 'low' | 'medium' | 'high'; timestamp: number }>;
  }>) => {
    onActiveStudents(students);
  };

  sock.on('active-students', handler);

  return () => {
    sock.off('active-students', handler);
  };
}

// Subscribe to teacher messages (for student)
export function subscribeTeacherMessages(
  onMessage: (event: TeacherMessageEvent) => void
): () => void {
  const sock = initializeMonitoringSocket();

  sock.on('teacher-message', onMessage);

  return () => {
    sock.off('teacher-message', onMessage);
  };
}

// Send message from teacher to student
export function sendMessageToStudent(studentId: string, examId: string, message: string) {
  const sock = getMonitoringSocket();
  if (!sock || !sock.connected) {
    return;
  }

  sock.emit('send-message', { studentId, examId, message });
}

// Disconnect from monitoring
export function disconnectMonitoring() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Check connection status
export function isMonitoringConnected(): boolean {
  return socket?.connected || false;
}
