"use client";

// Lightweight client-side monitoring event bus using BroadcastChannel with
// localStorage fallback so a teacher dashboard tab can receive exam events
// emitted from student exam tabs in the same origin (demo only – not secure).

export type MonitoringEvent =
  | { type: 'heartbeat'; payload: HeartbeatPayload }
  | { type: 'violation'; payload: ViolationPayload }
  | { type: 'question'; payload: QuestionChangePayload }
  | { type: 'webcam'; payload: WebcamPayload };

export interface BaseMonitoringPayload {
  studentId: string;
  examId: string;
  timestamp: number; // epoch ms
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

const CHANNEL_NAME = 'exam-monitoring-channel';

export function sendMonitoringEvent(event: MonitoringEvent) {
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage(event);
    bc.close();
  } catch {
    // Fallback: localStorage event (will trigger storage listeners in other tabs)
    try {
      localStorage.setItem(
        `${CHANNEL_NAME}-event`,
        JSON.stringify({ ...event, _localId: Math.random(), at: Date.now() })
      );
    } catch {}
  }
}

export function subscribeMonitoringEvents(onEvent: (e: MonitoringEvent) => void) {
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (ev) => {
      onEvent(ev.data as MonitoringEvent);
    };
  } catch {}

  const storageHandler = (e: StorageEvent) => {
    if (e.key === `${CHANNEL_NAME}-event` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        // Remove internal fields
  const { _localId: _ignoredLocalId, at: _ignoredAt, ...rest } = parsed; // eslint-disable-line @typescript-eslint/no-unused-vars
  onEvent(rest as MonitoringEvent);
      } catch {}
    }
  };
  window.addEventListener('storage', storageHandler);

  return () => {
    if (bc) bc.close();
    window.removeEventListener('storage', storageHandler);
  };
}
