# WebSocket Real-Time Monitoring Implementation

## Overview
This document describes the complete WebSocket implementation for real-time student monitoring during exams.

## Architecture

### Components

1. **Server** (`server.ts`)
   - Custom Next.js + Socket.IO server
   - Manages WebSocket connections at `/api/socket`
   - Handles rooms and presence tracking
   - Broadcasts events to teachers

2. **Client Library** (`app/lib/monitoringWebSocket.ts`)
   - Socket.IO client wrapper
   - Handles connection management
   - Provides functions for sending/receiving events

3. **Student Interface** (`app/exam/[id]/page.tsx`)
   - Joins exam room as student
   - Sends heartbeats every 5 seconds
   - Emits violation, question change, and webcam events

4. **Teacher Dashboard** (`app/dashboard/teacher/monitor/page.tsx`)
   - Subscribes to all monitoring events
   - Receives real-time updates from students
   - Displays active students and their activities

## Event Flow

### Student Joins Exam
1. Student opens exam page
2. `joinExamAsStudent(studentId, examId)` is called
3. Socket emits `join-exam` with `{ role: 'student', studentId, examId }`
4. Server:
   - Adds student to `exam:{examId}` room
   - Adds student to `student:{examId}:{studentId}` room
   - Marks student as active
   - Emits `student-joined` to teachers
   - Sends updated `active-students` list to teachers

### Student Sends Heartbeat
1. Every 5 seconds, student sends heartbeat
2. Event: `{ type: 'heartbeat', payload: { studentId, examId, questionIndex, webcamActive, timestamp } }`
3. Server forwards to `teachers` room
4. Teachers receive event and update UI

### Teacher Joins Monitoring
1. Teacher opens monitoring dashboard
2. Subscribes to all events (monitoring-event, active-students, etc.)
3. `joinExamAsTeacher(examId)` is called
4. Server:
   - Adds teacher to `teachers` room
   - Sends current `active-students` list
5. Teacher receives all subsequent student events

## Key Functions

### Student Side
```typescript
// Initialize and join exam
joinExamAsStudent(studentId: string, examId: string)

// Send monitoring events
sendMonitoringEvent(event: MonitoringEvent)

// Event types:
// - heartbeat: periodic activity ping
// - violation: security violation detected
// - question: question change
// - webcam: webcam status change
```

### Teacher Side
```typescript
// Join monitoring
joinExamAsTeacher(examId: string)

// Subscribe to events
subscribeMonitoringEvents((event) => {...})
subscribeActiveStudents((students) => {...})
subscribeStudentJoined((event) => {...})
subscribeStudentLeft((event) => {...})
subscribeStudentInactive((event) => {...})

// Send message to student
sendMessageToStudent(studentId, examId, message)

// Check connection
isMonitoringConnected()
```

## Rooms

- `teachers` - All teachers join this room to receive all events
- `exam:{examId}` - Specific exam room (optional for scoped monitoring)
- `student:{examId}:{studentId}` - Private room for direct teacher→student messages

## Debugging

### Enable Console Logs
All components have extensive console logging:
- `[Server]` - Server-side events
- `[WebSocket]` - Client-side socket operations
- `[WebSocket Client]` - Event subscription/handling
- `[Monitor]` - Teacher dashboard operations
- `[Exam]` - Student exam page operations

### Common Issues

1. **Students not showing up**
   - Check browser console for WebSocket connection errors
   - Verify server is running on correct port
   - Check if `join-exam` event is being emitted
   - Verify teachers subscribed to events BEFORE joining

2. **Events not received**
   - Ensure teachers join room AFTER setting up subscriptions
   - Check server logs to verify events are being forwarded
   - Verify socket connection state with `isMonitoringConnected()`

3. **Connection drops**
   - Socket.IO has automatic reconnection enabled
   - Check `reconnection` settings in client initialization
   - Monitor `connect_error` events

## Testing Steps

1. **Start Server**
   ```powershell
   npm run dev
   ```

2. **Open Teacher Dashboard**
   - Login as teacher
   - Navigate to `/dashboard/teacher/monitor`
   - Check console for connection logs
   - Verify "Connected" status in header

3. **Open Student Exam**
   - Login as student in different browser/tab
   - Navigate to exam page
   - Check console for join and heartbeat logs

4. **Verify Communication**
   - Teacher dashboard should show student in active list
   - Student count should increment
   - Heartbeats should update "Last active" timestamp
   - Question changes should reflect in real-time

## Configuration

### Server Settings (`server.ts`)
- Port: `3000` (default, configurable via `PORT` env var)
- Inactive timeout: `30000ms` (30 seconds)
- Inactivity check interval: `10000ms` (10 seconds)

### Client Settings (`monitoringWebSocket.ts`)
- Path: `/api/socket`
- Transports: `['websocket', 'polling']`
- Reconnection attempts: `5`
- Reconnection delay: `1000ms` to `5000ms`

### Student Heartbeat
- Interval: `5000ms` (5 seconds)

## Production Considerations

1. **Compile TypeScript server**
   - Consider building `server.ts` to JavaScript
   - Or switch to a JS entry point to avoid `ts-node` in production

2. **Scale Socket.IO**
   - Use Redis adapter for multi-server deployments
   - Configure sticky sessions for load balancing

3. **Security**
   - Validate student/teacher roles on server
   - Sanitize all event payloads
   - Implement rate limiting

4. **Performance**
   - Monitor active connections count
   - Implement connection limits per exam
   - Consider reducing heartbeat frequency for large exams
