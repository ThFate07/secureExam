# WebSocket Monitoring: Implementation Summary

This app now uses a Socket.IO server for real-time monitoring so teachers can see students in the dashboard during an exam.

What was added

- A custom Next.js + Socket.IO server in `server.ts` exposing the Socket.IO endpoint at `/api/socket`.
- Presence tracking with rooms:
  - Students join `exam:{examId}` and a private `student:{examId}:{studentId}` room.
  - All teachers join the common `teachers` room (and optionally a specific `exam:{examId}` as well).
  - Server broadcasts: `monitoring-event`, `student-joined`, `student-left`, `student-inactive`, and the current `active-students` list.
- Student exam page now sends monitoring events via WebSockets and joins the exam room automatically.

Dev and start commands

- Use `npm run dev` to start the custom server in development (runs `ts-node server.ts`).
- Use `npm run start` to start the same custom server (also runs `ts-node server.ts`).

Key files

- `server.ts`: hosts Next and Socket.IO; contains presence logic and transports events to teachers.
- `app/lib/monitoringWebSocket.ts`: Socket.IO client wrapper used by both student and teacher UIs.
- `app/exam/[id]/page.tsx`: now calls `joinExamAsStudent()` and emits via `sendMonitoringEvent()` from the WebSocket client.
- `app/dashboard/teacher/monitor/page.tsx`: subscribes to `monitoring-event` and presence signals; no code changes required beyond the above.

How it works

- When a student opens an exam, the client joins the exam room and starts sending periodic heartbeats and other events.
- Teachers (connected to the monitoring dashboard) receive the real-time events and the initial `active-students` list.
- If a student disconnects or goes inactive for ~30 seconds, teachers are notified.

Notes

- The teacher dashboard joins a global `teachers` room and receives events across all exams. If you want to scope by exam, pass the `examId` from the UI to `joinExamAsTeacher(examId)`.
- For production, consider compiling `server.ts` or switching to a JavaScript server entry to avoid relying on `ts-node`.

