import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Notification } from '@/model/projects-and-tasks/notificationModel';
import { successResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload || payload.userRole !== 'student') {
      return unauthorizedResponse('Unauthorized access');
    }

    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return notFoundResponse('Notification ID is required');
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        studentId: payload.userId,
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return notFoundResponse('Notification not found');
    }

    return successResponse('Notification marked as read', { notification }, 200);
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    return serverErrorResponse('An error occurred while marking notification as read');
  }
}