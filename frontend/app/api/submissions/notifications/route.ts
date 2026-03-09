import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import SubmissionNotification from '@/model/submissions/submissionNotificationModel';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';

function getPayload(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

// ─── GET: list notifications for the authenticated student ────

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const payload = getPayload(request);
    if (!payload) return unauthorizedResponse();

    const notifications = await SubmissionNotification.find({ studentId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return successResponse('Notifications fetched', { notifications });
  } catch (err) {
    console.error('GET /api/submissions/notifications error:', err);
    return serverErrorResponse('Failed to fetch notifications');
  }
}

// ─── POST: create a notification (lecturer only) ──────────────

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const payload = getPayload(request);
    if (!payload || payload.userRole !== 'lecture') return unauthorizedResponse('Lecturer access required');

    const body = await request.json();
    const { studentId, submissionId, type, title, message, link } = body as {
      studentId?: string;
      submissionId?: string;
      type?: string;
      title?: string;
      message?: string;
      link?: string;
    };

    if (!studentId || !submissionId || !type || !title || !message || !link) {
      return errorResponse('Missing required fields');
    }

    const notification = await SubmissionNotification.create({
      studentId,
      submissionId,
      type,
      title,
      message,
      link,
    });

    return successResponse('Notification created', notification, 201);
  } catch (err) {
    console.error('POST /api/submissions/notifications error:', err);
    return serverErrorResponse('Failed to create notification');
  }
}

// ─── PATCH: mark notification(s) as read ──────────────────────

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const payload = getPayload(request);
    if (!payload) return unauthorizedResponse();

    const body = await request.json();
    const { notificationId, markAllRead } = body as { notificationId?: string; markAllRead?: boolean };

    if (markAllRead) {
      await SubmissionNotification.updateMany(
        { studentId: payload.userId, isRead: false },
        { isRead: true },
      );
      return successResponse('All notifications marked as read');
    }

    if (!notificationId) return errorResponse('notificationId or markAllRead required');

    await SubmissionNotification.updateOne(
      { _id: notificationId, studentId: payload.userId },
      { isRead: true },
    );

    return successResponse('Notification marked as read');
  } catch (err) {
    console.error('PATCH /api/submissions/notifications error:', err);
    return serverErrorResponse('Failed to update notification');
  }
}
