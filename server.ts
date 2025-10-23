import next from 'next';
import http from 'http';
import { Server as IOServer, Socket } from 'socket.io';

// Next.js + Socket.IO custom server
// - Serves the Next.js app
// - Hosts a Socket.IO server at path '/api/socket'
// - Manages real-time monitoring rooms and presence

type MonitoringEvent =
	| { type: 'heartbeat'; payload: HeartbeatPayload }
	| { type: 'violation'; payload: ViolationPayload }
	| { type: 'question'; payload: QuestionChangePayload }
	| { type: 'webcam'; payload: WebcamPayload };

interface BaseMonitoringPayload {
	studentId: string;
	examId: string;
	timestamp: number;
}

interface HeartbeatPayload extends BaseMonitoringPayload {
	questionIndex: number;
	webcamActive: boolean;
}

interface ViolationPayload extends BaseMonitoringPayload {
	description: string;
	severity: 'low' | 'medium' | 'high';
}

interface QuestionChangePayload extends BaseMonitoringPayload {
	questionIndex: number;
}

interface WebcamPayload extends BaseMonitoringPayload {
	webcamActive: boolean;
}

interface JoinExamPayload {
	studentId?: string;
	examId?: string;
	role: 'student' | 'teacher';
}

interface SendMessagePayload {
	studentId: string;
	examId: string;
	message: string;
}

// Track active students per exam
// Map<examId, Map<studentId, { lastActivity: number }>>
const activeStudents = new Map<string, Map<string, { lastActivity: number }>>();

// Track socket meta to handle disconnects
type SocketMeta = {
	role?: 'student' | 'teacher';
	studentId?: string;
	examId?: string;
};

// Helper: list active students (optionally for a single exam)
function getActiveStudents(examId?: string) {
	if (examId) {
		const m = activeStudents.get(examId) || new Map();
		return Array.from(m.entries()).map(([studentId, v]) => ({
			studentId,
			examId,
			lastActivity: v.lastActivity,
		}));
	}
	const out: Array<{ studentId: string; examId: string; lastActivity: number }> = [];
	for (const [exId, map] of activeStudents.entries()) {
		for (const [studentId, v] of map.entries()) {
			out.push({ studentId, examId: exId, lastActivity: v.lastActivity });
		}
	}
	return out;
}

// Helper: update student activity timestamp
function touchStudent(examId: string, studentId: string, ts: number) {
	let m = activeStudents.get(examId);
	if (!m) {
		m = new Map();
		activeStudents.set(examId, m);
	}
	m.set(studentId, { lastActivity: ts });
}

// Helper: remove student
function removeStudent(examId?: string, studentId?: string) {
	if (!examId || !studentId) return false;
	const m = activeStudents.get(examId);
	if (!m) return false;
	const existed = m.delete(studentId);
	if (m.size === 0) activeStudents.delete(examId);
	return existed;
}

// Create Next app and custom HTTP server
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
	const server = http.createServer(async (req, res) => {
		// Delegate all HTTP handling to Next.js
		handle(req, res);
	});

	// Initialize Socket.IO on the same server
	const io = new IOServer(server, {
		path: '/api/socket',
		cors: { origin: true, credentials: true },
	});

	// Periodic inactivity check (30s)
	const INACTIVE_AFTER_MS = 30_000;
	setInterval(() => {
		const now = Date.now();
		for (const [examId, map] of activeStudents.entries()) {
			for (const [studentId, { lastActivity }] of map.entries()) {
				if (now - lastActivity > INACTIVE_AFTER_MS) {
					// Notify teachers of inactivity
					io.to('teachers').emit('student-inactive', { studentId, examId, timestamp: now });
				}
			}
		}
	}, 10_000);

	io.on('connection', (socket: Socket) => {
		const meta: SocketMeta = {};
		console.log('[Server] New WebSocket connection, socket.id:', socket.id);

		socket.on('join-exam', (payload: JoinExamPayload) => {
			console.log('[Server] join-exam event received:', payload);
			meta.role = payload.role;
			meta.examId = payload.examId;
			meta.studentId = payload.studentId;

			if (payload.role === 'teacher') {
				// All teachers join a common room to receive all events
				socket.join('teachers');
				console.log('[Server] Teacher joined "teachers" room');
				// Also optionally join a specific exam room if provided
				if (payload.examId) {
					socket.join(`exam:${payload.examId}`);
					console.log(`[Server] Teacher joined exam:${payload.examId} room`);
				}

				// Send current active students (for the specific exam if provided, otherwise all)
				const list = getActiveStudents(payload.examId);
				console.log('[Server] Sending active students list to teacher:', list.length, 'students');
				socket.emit('active-students', list);
			} else if (payload.role === 'student' && payload.examId && payload.studentId) {
				// Student joins their exam room and a personal room for direct messages
				socket.join(`exam:${payload.examId}`);
				socket.join(`student:${payload.examId}:${payload.studentId}`);
				console.log(`[Server] Student ${payload.studentId} joined exam:${payload.examId}`);

				// Mark active and notify teachers
				const now = Date.now();
				touchStudent(payload.examId, payload.studentId, now);
				io.to('teachers').emit('student-joined', {
					studentId: payload.studentId,
					examId: payload.examId,
					timestamp: now,
				});
				console.log(`[Server] Notified teachers: student ${payload.studentId} joined exam ${payload.examId}`);

				// Optionally, send an immediate heartbeat to teachers via active list update
				const updatedList = getActiveStudents(payload.examId);
				io.to('teachers').emit('active-students', updatedList);
				console.log(`[Server] Sent updated active students list (${updatedList.length} students) to teachers`);
			}
		});

		socket.on('monitoring-event', (event: MonitoringEvent) => {
			console.log('[Server] Received monitoring-event:', event.type, 'from student:', event.payload?.studentId);
			// Forward events to teachers (global room) and the specific exam room
			io.to('teachers').emit('monitoring-event', event);
			if (event?.payload?.examId) io.to(`exam:${event.payload.examId}`).emit('monitoring-event', event);

			// Update presence timestamp for student-originated events
			const p = event?.payload as BaseMonitoringPayload | undefined;
			if (p?.examId && p?.studentId && p?.timestamp) {
				touchStudent(p.examId, p.studentId, p.timestamp);
			}
		});

		socket.on('send-message', (msg: SendMessagePayload) => {
			console.log(`[Server] Teacher sending message to student ${msg.studentId} in exam ${msg.examId}`);
			// Allow teachers to send messages to a specific student
			io.to(`student:${msg.examId}:${msg.studentId}`).emit('teacher-message', {
				message: msg.message,
				timestamp: Date.now(),
			});
		});

		socket.on('disconnect', () => {
			console.log('[Server] Socket disconnected:', socket.id, 'role:', meta.role, 'studentId:', meta.studentId);
			// If a student disconnects, mark them as left
			if (meta.role === 'student' && meta.examId && meta.studentId) {
				const removed = removeStudent(meta.examId, meta.studentId);
				if (removed) {
					console.log(`[Server] Student ${meta.studentId} left exam ${meta.examId}`);
					io.to('teachers').emit('student-left', {
						studentId: meta.studentId,
						examId: meta.examId,
						timestamp: Date.now(),
					});
				}
			}
		});
	});

	const port = parseInt(process.env.PORT || '3000', 10);
		server.listen(port, () => {
			console.log(`> Server ready on http://localhost:${port}`);
		});
	}).catch((err) => {
		console.error('Failed to start server:', err);
	process.exit(1);
});

