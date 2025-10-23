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
  if (socket && socket.connected) {
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
    console.log('[WebSocket] Connected to monitoring server, socket.id:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('[WebSocket] Disconnected from monitoring server');
  });

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] Connection error:', error);
  });

  // Test listener for ANY event
  socket.onAny((eventName, ...args) => {
    console.log(`[WebSocket] Received event: ${eventName}`, args);
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
    console.log(`[WebSocket] Student ${studentId} joining exam ${examId}, socket connected: ${sock.connected}`);
    sock.emit('join-exam', { studentId, examId, role: 'student' });
  };

  // If already connected, join immediately
  if (sock.connected) {
    doJoin();
  } else {
    // Wait for connection before joining
    console.log('[WebSocket] Waiting for connection before joining...');
    sock.once('connect', doJoin);
  }
}

// Teacher joins exam monitoring
export function joinExamAsTeacher(examId: string) {
  const sock = initializeMonitoringSocket();
  
  const doJoin = () => {
    console.log(`[WebSocket] Teacher joining monitoring for exam ${examId}, socket connected:`, sock.connected);
    sock.emit('join-exam', { examId, role: 'teacher' });
  };

  // If already connected, join immediately
  if (sock.connected) {
    doJoin();
  } else {
    // Wait for connection before joining
    console.log('[WebSocket] Waiting for connection before joining...');
    sock.once('connect', doJoin);
  }
}

// Send monitoring event (from student)
export function sendMonitoringEvent(event: MonitoringEvent) {
  const sock = getMonitoringSocket();
  if (!sock) {
    console.warn('[WebSocket] Socket not initialized, initializing now...');
    const newSock = initializeMonitoringSocket();
    if (!newSock.connected) {
      console.warn('[WebSocket] Socket not connected yet, queuing event:', event.type);
      // Queue the event to be sent when connected
      newSock.once('connect', () => {
        console.log('[WebSocket] Now connected, sending queued event:', event.type);
        newSock.emit('monitoring-event', event);
      });
      return;
    }
    newSock.emit('monitoring-event', event);
    console.log('[WebSocket] Sent event:', event.type, 'from newly initialized socket');
    return;
  }
  
  if (!sock.connected) {
    console.warn('[WebSocket] Socket not connected, event not sent:', event.type);
    console.warn('[WebSocket] Socket state - connected:', sock.connected, 'id:', sock.id);
    return;
  }

  sock.emit('monitoring-event', event);
  console.log('[WebSocket] Sent event:', event.type, 'studentId:', event.payload?.studentId);
}

// Subscribe to monitoring events (for teacher)
export function subscribeMonitoringEvents(
  onEvent: (event: MonitoringEvent) => void
): () => void {
  const sock = initializeMonitoringSocket();

  const handler = (event: MonitoringEvent) => {
    console.log('[WebSocket Client] Received monitoring-event:', event);
    console.log('[WebSocket Client] Event type:', event?.type, 'payload:', event?.payload);
    console.log('[WebSocket Client] Calling onEvent handler...');
    try {
      onEvent(event);
      console.log('[WebSocket Client] onEvent handler completed successfully');
    } catch (error) {
      console.error('[WebSocket Client] Error in onEvent handler:', error);
    }
  };

  sock.on('monitoring-event', handler);
  console.log('[WebSocket Client] Subscribed to monitoring-event');

  return () => {
    console.log('[WebSocket Client] Unsubscribed from monitoring-event');
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
  onActiveStudents: (students: Array<{ studentId: string; examId: string; lastActivity: number }>) => void
): () => void {
  const sock = initializeMonitoringSocket();

  const handler = (students: Array<{ studentId: string; examId: string; lastActivity: number }>) => {
    console.log('[WebSocket Client] Received active-students:', students);
    console.log('[WebSocket Client] Number of active students:', students?.length);
    try {
      onActiveStudents(students);
      console.log('[WebSocket Client] active-students handler completed successfully');
    } catch (error) {
      console.error('[WebSocket Client] Error in active-students handler:', error);
    }
  };

  sock.on('active-students', handler);
  console.log('[WebSocket Client] Subscribed to active-students');

  return () => {
    console.log('[WebSocket Client] Unsubscribed from active-students');
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
    console.warn('[WebSocket] Socket not connected, message not sent');
    return;
  }

  sock.emit('send-message', { studentId, examId, message });
}

// Disconnect from monitoring
export function disconnectMonitoring() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[WebSocket] Disconnected from monitoring');
  }
}

// Check connection status
export function isMonitoringConnected(): boolean {
  return socket?.connected || false;
}
