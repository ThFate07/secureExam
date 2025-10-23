# WebSocket Real-Time Monitoring - Testing Guide

## Server Status

✅ Server is running on http://localhost:3000
✅ WebSocket endpoint available at `/api/socket`

## Quick Test Steps

### 1. Test Teacher Dashboard First

1. Open your browser and navigate to: http://localhost:3000
2. Login as a **teacher** account
3. Navigate to the monitoring dashboard:
   - Click "Teacher Dashboard" or go to `/dashboard/teacher/monitor`
4. Open browser console (F12) and look for these logs:
   ```
   [Monitor] Initializing monitoring dashboard for exam: default-exam-id
   [WebSocket] Connected to monitoring server, socket.id: <socket-id>
   [WebSocket Client] Subscribed to monitoring-event
   [WebSocket Client] Subscribed to active-students
   [Server] New WebSocket connection, socket.id: <socket-id>
   [Server] join-exam event received: {examId: "default-exam-id", role: "teacher"}
   [Server] Teacher joined "teachers" room
   ```
5. Check the dashboard header - it should show **"Connected"** status with a green WiFi icon
6. Initially, you should see "Waiting for student activity..." message

### 2. Test Student Exam Page

1. Open a **new browser window** or **incognito/private window**
2. Navigate to: http://localhost:3000
3. Login as a **student** account
4. Start an exam or navigate to an exam page
5. Open browser console (F12) and look for these logs:
   ```
   [Exam] Joining exam monitoring room, studentId: <student-id>, examId: <exam-id>
   [WebSocket] Student <student-id> joining exam <exam-id>, socket connected: true
   [Exam] Starting heartbeat for student: <student-id> exam: <exam-id>
   [Exam] Sending heartbeat: {type: "heartbeat", payload: {...}}
   [WebSocket] Sent event: heartbeat studentId: <student-id>
   ```

### 3. Verify Real-Time Updates

**On the Teacher Dashboard (first window):**

You should see console logs like:
```
[Server] Received monitoring-event: heartbeat from student: <student-id>
[WebSocket Client] Received monitoring-event: {type: "heartbeat", payload: {...}}
[Monitor] Received event: heartbeat from student: <student-id> exam: <exam-id>
[Monitor] Creating new student record: <student-id> exam: <exam-id>
```

**In the dashboard UI:**
- Student count should increment from 0 to 1
- The student should appear in the "Student Monitoring" section
- You should see the student's name (or ID), current question number, and "Last active" timestamp
- The "Last active" timestamp should update every ~5 seconds (heartbeat interval)
- Webcam status should be displayed
- Green dot indicator for active status

### 4. Test Question Navigation

**On the Student Exam Page:**
1. Click "Next" or "Previous" button to change questions
2. Console should log:
   ```
   [Exam] Sending monitoring event for question change
   [WebSocket] Sent event: question studentId: <student-id>
   ```

**On the Teacher Dashboard:**
- The "Question X" number should update in real-time
- Console should log the question change event

### 5. Test Violations

**On the Student Exam Page:**
1. Try to trigger a violation (depending on exam security settings):
   - Switch to another tab (if tab switching is monitored)
   - Exit fullscreen (if fullscreen is required)
   - Open DevTools (if restricted)
2. Console should log:
   ```
   [Exam] Violation detected: <violation-description>
   [WebSocket] Sent event: violation studentId: <student-id>
   ```

**On the Teacher Dashboard:**
- "Total Violations" count should increment
- The student's warnings count should increase
- Violation should appear in the "Recent Activities" section when student is selected
- Background color may change based on warning count

### 6. Test Student Disconnect

**On the Student Exam Page:**
1. Close the browser tab/window OR
2. Navigate away from the exam page

**On the Teacher Dashboard:**
- After ~30 seconds, the student should be marked as inactive
- Console should log:
   ```
   [Server] Socket disconnected: <socket-id> role: student studentId: <student-id>
   [Server] Student <student-id> left exam <exam-id>
   [Monitor] Student left: <student-id>
   ```
- The student should be removed from the active students list

### 7. Test Multiple Students

1. Open multiple browser windows/tabs (use incognito/private mode)
2. Login with different student accounts
3. Have each student start the same exam
4. On the teacher dashboard:
   - All students should appear in the list
   - Each student should show their individual progress
   - Heartbeats should update independently
   - Student count should match the number of active students

## Expected Console Logs Summary

### Server Console (Terminal)
```
> Server ready on http://localhost:3000
[Server] New WebSocket connection, socket.id: abc123
[Server] join-exam event received: {examId: "...", role: "teacher"}
[Server] Teacher joined "teachers" room
[Server] Sending active students list to teacher: 0 students
[Server] New WebSocket connection, socket.id: def456
[Server] join-exam event received: {studentId: "...", examId: "...", role: "student"}
[Server] Student xyz joined exam:exam-123
[Server] Notified teachers: student xyz joined exam exam-123
[Server] Sent updated active students list (1 students) to teachers
[Server] Received monitoring-event: heartbeat from student: xyz
```

### Teacher Browser Console
```
[Monitor] Initializing monitoring dashboard for exam: default-exam-id
[WebSocket] Connected to monitoring server, socket.id: abc123
[WebSocket Client] Subscribed to monitoring-event
[WebSocket Client] Received active-students: []
[WebSocket Client] Received monitoring-event: {type: "heartbeat", ...}
[Monitor] Received event: heartbeat from student: xyz exam: exam-123
[Monitor] Creating new student record: xyz exam: exam-123
```

### Student Browser Console
```
[Exam] Joining exam monitoring room, studentId: xyz, examId: exam-123
[WebSocket] Student xyz joining exam exam-123, socket connected: true
[Exam] Starting heartbeat for student: xyz exam: exam-123
[Exam] Sending heartbeat: {type: "heartbeat", payload: {...}}
[WebSocket] Sent event: heartbeat studentId: xyz
```

## Troubleshooting

### Issue: "Waiting for student activity..." message persists

**Possible causes:**
1. Student hasn't started an exam yet
2. WebSocket connection failed
3. Events aren't being forwarded properly

**Check:**
- Student browser console for connection errors
- Server terminal for "Student xyz joined exam" message
- Teacher browser console for "Received monitoring-event" logs

### Issue: Connection status shows "Disconnected"

**Possible causes:**
1. Server not running
2. WebSocket path misconfigured
3. CORS or network issues

**Fix:**
- Verify server is running: `npm run dev`
- Check server terminal for errors
- Ensure no firewall blocking WebSocket connections
- Check browser console for `connect_error` events

### Issue: Students not appearing in real-time

**Possible causes:**
1. Student not calling `joinExamAsStudent()`
2. Events subscribed after joining room
3. Socket not connected when emitting

**Check:**
- Student console for "joining exam monitoring room" log
- Teacher console for event subscription logs BEFORE join
- Socket connection state before emitting events

### Issue: Heartbeats not updating "Last active"

**Possible causes:**
1. Heartbeat interval not running
2. Events not being received
3. State not updating in React

**Check:**
- Student console for "Sending heartbeat" every 5 seconds
- Teacher console for "Received monitoring-event: heartbeat" logs
- React DevTools to verify state updates

## Success Criteria

✅ Teacher sees "Connected" status
✅ Student appears in active students list within 5 seconds of joining
✅ "Last active" timestamp updates every ~5 seconds
✅ Question number updates when student navigates
✅ Violations appear in real-time
✅ Student count is accurate
✅ Multiple students can be monitored simultaneously
✅ Student is removed when they disconnect

## Next Steps

Once basic functionality is confirmed:

1. **Test with real exam data**
   - Create actual exams in the system
   - Test with real question navigation
   - Verify exam-specific filtering

2. **Test security features**
   - Enable all anti-cheat settings
   - Test webcam monitoring
   - Test violation detection

3. **Load testing**
   - Test with 10+ simultaneous students
   - Monitor server performance
   - Check for memory leaks

4. **Production preparation**
   - Configure environment variables
   - Set up proper logging
   - Implement error tracking
   - Configure Redis adapter for scaling
