import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { ScheduledReminder, Notification } from '@/model/projects-and-tasks/notificationModel';
import { Project, Task, StudentProjectProgress, StudentTaskProgress } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response';
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
    const { projectId, taskId } = body;

    if (!projectId && !taskId) {
      return serverErrorResponse('Project ID or Task ID is required');
    }

    const isProject = !!projectId;
    const item = isProject
      ? await Project.findById(projectId)
      : await Task.findById(taskId);

    if (!item) {
      return serverErrorResponse(`${isProject ? 'Project' : 'Task'} not found`);
    }

    // Check if reminders already exist
    const existingReminders = await ScheduledReminder.find({
      studentId: payload.userId,
      projectId: isProject ? projectId : undefined,
      taskId: !isProject ? taskId : undefined,
    });

    if (existingReminders.length > 0) {
      return successResponse('Reminders already scheduled', { reminders: existingReminders }, 200);
    }

    const deadlineDate = new Date(`${item.deadlineDate}T${item.deadlineTime || '23:59'}`);
    const now = new Date();
    const totalTime = deadlineDate.getTime() - now.getTime();

    const reminderPercentages = [
      { percentage: 25, type: isProject ? 'project_25' : 'task_25' },
      { percentage: 50, type: isProject ? 'project_50' : 'task_50' },
      { percentage: 75, type: isProject ? 'project_75' : 'task_75' },
      { percentage: 100, type: isProject ? 'project_deadline' : 'task_deadline' },
    ];

    const reminders = reminderPercentages.map((reminder) => {
      // PRODUCTION: Calculate based on actual deadline
      // const scheduledTime = new Date(now.getTime() + (totalTime * reminder.percentage) / 100);

      // TESTING: fixed delays (10, 30, 60, 90 seconds)
      const delaySeconds = { 25: 10, 50: 30, 75: 60, 100: 90 }[reminder.percentage] || 10;
      const scheduledTime = new Date(now.getTime() + delaySeconds * 1000);

      return {
        studentId: payload.userId,
        projectId: isProject ? projectId : undefined,
        taskId: !isProject ? taskId : undefined,
        reminderType: reminder.type,
        reminderPercentage: reminder.percentage,
        deadlineDate,
        isProcessed: false,
        scheduledFor: scheduledTime,
      };
    });

    await ScheduledReminder.insertMany(reminders);

    return successResponse('Reminders scheduled', { reminders }, 200);
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