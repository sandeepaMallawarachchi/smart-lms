import { NextRequest } from 'next/server';
import { unauthorizedResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';
import { subscribeStudentNotifications } from '@/lib/projects-and-tasks/notifications/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const queryToken = request.nextUrl.searchParams.get('token');
  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.replace('Bearer ', '');
  const token = queryToken || headerToken;

  if (!token) {
    return unauthorizedResponse('No token provided');
  }

  const payload = verifyToken(token);
  if (!payload || payload.userRole !== 'student') {
    return unauthorizedResponse('Unauthorized access');
  }

  const encoder = new TextEncoder();
  const studentId = payload.userId;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: 'connected', at: new Date().toISOString() });

      const unsubscribe = subscribeStudentNotifications(studentId, (event) => {
        send(event as unknown as Record<string, unknown>);
      });

      const heartbeat = setInterval(() => {
        send({ type: 'ping', at: new Date().toISOString() });
      }, 15000);

      request.signal.addEventListener(
        'abort',
        () => {
          clearInterval(heartbeat);
          unsubscribe();
          controller.close();
        },
        { once: true }
      );
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
