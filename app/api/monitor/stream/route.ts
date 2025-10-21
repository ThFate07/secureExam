import { NextRequest } from 'next/server';
import { requireAuth } from '@/app/lib/api/auth';
import prisma from '@/app/lib/prisma';
import { ApiError } from '@/app/lib/api/errors';

// GET /api/monitor/stream - Server-Sent Events stream for real-time monitoring
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    if (!examId) {
      throw new ApiError(400, 'examId is required');
    }

    // Verify user has access to this exam
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    if (exam.createdById !== user.id && user.role !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to monitor this exam');
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        const message = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date() })}\n\n`;
        controller.enqueue(encoder.encode(message));

        // Poll for new events every 3 seconds
        const intervalId = setInterval(async () => {
          try {
            // Get recent events (last 10 seconds)
            const recentEvents = await prisma.monitoringEvent.findMany({
              where: {
                examId,
                timestamp: {
                  gte: new Date(Date.now() - 10000), // Last 10 seconds
                },
              },
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: { timestamp: 'desc' },
              take: 50,
            });

            if (recentEvents.length > 0) {
              const eventMessage = `data: ${JSON.stringify({ 
                type: 'events', 
                events: recentEvents,
                timestamp: new Date()
              })}\n\n`;
              controller.enqueue(encoder.encode(eventMessage));
            }

            // Send heartbeat
            const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date() })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch (error) {
            console.error('Error in SSE stream:', error);
          }
        }, 3000);

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(intervalId);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
