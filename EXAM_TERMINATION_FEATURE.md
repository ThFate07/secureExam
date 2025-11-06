# Exam Termination Feature Documentation

## Overview
This feature allows teachers to immediately terminate a student's exam session during real-time monitoring. Once terminated, the student cannot continue the exam and is redirected to their dashboard with an appropriate message.

## Features Implemented

### 1. Database Schema Support
- Uses existing `TERMINATED` status in `AttemptStatus` enum
- Tracks termination events in `MonitoringEvent` table
- Creates audit logs for accountability

### 2. API Endpoints

#### POST `/api/attempts/terminate/exam`
Terminates an active exam attempt for a specific student and exam.

**Request Body:**
```json
{
  "studentId": "string",
  "examId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Exam terminated successfully",
    "attempt": {
      "id": "string",
      "status": "TERMINATED",
      "endTime": "2025-10-30T...",
      "student": { ... },
      "exam": { ... }
    }
  }
}
```

### 3. Real-time WebSocket Communication

#### Teacher Side:
- New `terminateStudentExam(studentId, examId, reason)` function
- Server handles `terminate-exam` event
- Immediately removes student from active monitoring list

#### Student Side:
- New `subscribeExamTermination(onTerminated)` function
- Listens for `exam-terminated` events
- Automatically leaves monitoring room when terminated

### 4. Teacher Monitoring Interface

#### New UI Elements:
- **Terminate Exam** card in student details sidebar
- Red-themed terminate button with warning
- Confirmation modal with required termination reason
- Real-time removal from active students list

#### User Flow:
1. Teacher selects a student from monitoring list
2. Clicks "Terminate Exam" button in sidebar
3. Enters required termination reason in modal
4. Confirms termination action
5. Student is immediately removed from monitoring
6. WebSocket notification sent to student

### 5. Student Exam Interface

#### Termination Detection:
- Checks for terminated status on exam load
- Subscribes to real-time termination events
- Prevents all exam interactions when terminated

#### Termination UI:
- Full-screen modal with clear termination message
- Shows exam title and termination reason
- Red warning theme with Ban icon
- "Return to Dashboard" button for navigation
- Helpful message about contacting teacher

### 6. Updated Exam Start API

#### Enhanced Logic:
- Detects existing terminated attempts
- Returns termination status and reason
- Prevents new attempts after termination
- Includes terminated attempts in max attempts count

## Security Features

### Authorization:
- Only teachers can terminate exams for their own created exams
- Students cannot terminate their own or others' exams
- Requires valid authentication tokens

### Audit Trail:
- All terminations logged in `AuditLog` table
- Includes teacher ID, IP address, user agent
- Tracks previous and new attempt status
- Creates monitoring events for termination

### Real-time Integrity:
- Immediate WebSocket notification prevents continued work
- Server-side removal from active monitoring
- Database status update prevents restart
- UI completely blocks interaction

## Usage Examples

### Teacher Terminating an Exam:
1. Open teacher monitoring dashboard
2. See active students taking exams
3. Click on a student to view details
4. Scroll to "Terminate Exam" section
5. Click "Terminate Exam" button
6. Enter reason (e.g., "Suspicious behavior detected")
7. Confirm termination
8. Student immediately sees termination screen

### Student Experience During Termination:
1. Student is actively taking exam
2. Teacher terminates the exam
3. Student immediately sees termination modal
4. All exam controls become disabled
5. Only option is to return to dashboard
6. Cannot restart or continue the exam

## Technical Implementation Details

### Database Changes:
- No schema changes required (uses existing TERMINATED status)
- New monitoring events track termination
- Audit logs provide accountability

### WebSocket Events:
```typescript
// Teacher sends termination
socket.emit('terminate-exam', {
  studentId: 'string',
  examId: 'string', 
  reason: 'string'
});

// Student receives termination
socket.on('exam-terminated', {
  examId: 'string',
  studentId: 'string',
  terminatedBy: 'teacher',
  reason: 'string',
  timestamp: number
});
```

### API Integration:
- RESTful termination endpoint
- Proper error handling and validation
- Consistent response format
- Teacher authorization checks

## Error Handling

### Common Error Cases:
- **404**: No active attempt found for student/exam
- **403**: Teacher not authorized (not exam creator)
- **400**: Missing required fields or invalid attempt status
- **401**: Authentication required

### Client-side Handling:
- User-friendly error messages
- Graceful degradation if WebSocket fails
- Retry mechanism for API calls
- Proper loading states

## Future Enhancements

### Potential Improvements:
1. **Batch Termination**: Terminate multiple students at once
2. **Scheduled Termination**: Auto-terminate after time/violation thresholds
3. **Termination Templates**: Pre-defined termination reasons
4. **Email Notifications**: Notify students via email about termination
5. **Grade Recovery**: Option to assign partial credit before termination
6. **Appeal Process**: Allow students to contest terminations

### Analytics Integration:
- Track termination rates per teacher/exam
- Identify patterns in violations leading to termination
- Generate reports on exam integrity incidents

## Testing Recommendations

### Manual Testing:
1. Create test exam and enroll test student
2. Start exam as student
3. Monitor as teacher
4. Terminate exam and verify student experience
5. Verify database records and audit logs

### Automated Testing:
- Unit tests for termination API
- Integration tests for WebSocket events
- E2E tests for full user journey
- Security tests for authorization

## Deployment Notes

### Prerequisites:
- WebSocket server running (server.ts)
- Database migrations applied (if any)
- Authentication system functional

### Configuration:
- No additional environment variables required
- Uses existing JWT and database configuration
- WebSocket path: `/api/socket`

### Monitoring:
- Monitor WebSocket connection health
- Track termination API usage
- Alert on unusual termination patterns