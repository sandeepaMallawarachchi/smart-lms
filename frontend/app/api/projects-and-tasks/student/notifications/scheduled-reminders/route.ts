import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Notification } from '@/model/projects-and-tasks/notificationModel';
import { Project, Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';
import { scheduleReminderJobsForStudentItem } from '@/lib/projects-and-tasks/reminders/scheduler';

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
    const { projectId, taskId } = body as { projectId?: string; taskId?: string };

    if (!projectId && !taskId) {
      return serverErrorResponse('Project ID or Task ID is required');
    }

    let itemType: 'project' | 'task' | null = null;
    let itemId: string | null = null;
    let item: any = null;

    if (projectId) {
      const project = await Project.findById(projectId).lean();
      if (project) {
        itemType = 'project';
        itemId = projectId;
        item = project;
      }
    }

    if (!item && taskId) {
      const task = await Task.findById(taskId).lean();
      if (task) {
        itemType = 'task';
        itemId = taskId;
        item = task;
      }
    }

    // Backward compatibility: some clients may send task id in projectId.
    if (!item && projectId) {
      const taskFallback = await Task.findById(projectId).lean();
      if (taskFallback) {
        itemType = 'task';
        itemId = projectId;
        item = taskFallback;
      }
    }

    if (!item) {
      return serverErrorResponse('Project or task not found');
    }

    const resolvedItemType = itemType as 'project' | 'task';
    const resolvedItemId = itemId as string;
    const itemName = resolvedItemType === 'project' ? item.projectName : item.taskName;
    const scheduledJobs = await scheduleReminderJobsForStudentItem({
      studentId: payload.userId,
      itemType: resolvedItemType,
      itemId: resolvedItemId,
      itemName,
      deadlineDate: item.deadlineDate,
      deadlineTime: item.deadlineTime || '23:59',
    });

    return successResponse(
      'Reminders scheduled',
      {
        itemType: resolvedItemType,
        itemId: resolvedItemId,
        itemName,
        reminders: scheduledJobs,
      },
      200
    );
  } catch (error: any) {
    console.error('Schedule reminders error:', error);
    return serverErrorResponse('An error occurred while scheduling reminders');
  }
}

export async function GET(request: NextRequest) {
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

    const notifications = await Notification.find({
      studentId: payload.userId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return successResponse('Notifications retrieved', { notifications }, 200);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return serverErrorResponse('An error occurred while fetching notifications');
  }
}
