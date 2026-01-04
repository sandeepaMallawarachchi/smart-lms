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
      const scheduledTime = new Date(now.getTime() + (totalTime * reminder.percentage) / 100);

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

    const now = new Date();
    const processedReminders = await ScheduledReminder.find({
      studentId: payload.userId,
      isProcessed: false,
      scheduledFor: { $lte: now },
    });

    for (const reminder of processedReminders) {
      const isProject = !!reminder.projectId;
      const item = isProject
        ? await Project.findById(reminder.projectId)
        : await Task.findById(reminder.taskId);

      const progress = isProject
        ? await StudentProjectProgress.findOne({
            studentId: payload.userId,
            projectId: reminder.projectId,
          })
        : await StudentTaskProgress.findOne({
            studentId: payload.userId,
            taskId: reminder.taskId,
          });

      if (!item || !progress || progress.status === 'done') {
        await ScheduledReminder.updateOne({ _id: reminder._id }, { isProcessed: true });
        continue;
      }

      const reminderMessages: Record<string, { title: string; message: string; description: string }> = {
        project_25: {
          title: '⏰ Time to Start!',
          message: `${item.projectName || item.taskName} deadline approaching`,
          description: `You have 75% of the time left. Start working on ${item.projectName || item.taskName} now!`,
        },
        project_50: {
          title: '⚠️ Halfway There!',
          message: `${item.projectName || item.taskName} is 50% through`,
          description: `Complete half of the work on ${item.projectName || item.taskName}!`,
        },
        project_75: {
          title: '🚨 Deadline is Near!',
          message: `${item.projectName || item.taskName} deadline approaching fast`,
          description: `Just 25% of time left. Finish up ${item.projectName || item.taskName}!`,
        },
        project_deadline: {
          title: '📅 Deadline Today!',
          message: `${item.projectName || item.taskName} deadline is today`,
          description: `Today is the deadline for ${item.projectName || item.taskName}. Complete it now!`,
        },
        task_25: {
          title: '⏰ Time to Start!',
          message: `${item.taskName} deadline approaching`,
          description: `You have 75% of the time left. Start working on ${item.taskName} now!`,
        },
        task_50: {
          title: '⚠️ Halfway There!',
          message: `${item.taskName} is 50% through`,
          description: `Complete half of the work on ${item.taskName}!`,
        },
        task_75: {
          title: '🚨 Deadline is Near!',
          message: `${item.taskName} deadline approaching fast`,
          description: `Just 25% of time left. Finish up ${item.taskName}!`,
        },
        task_deadline: {
          title: '📅 Deadline Today!',
          message: `${item.taskName} deadline is today`,
          description: `Today is the deadline for ${item.taskName}. Complete it now!`,
        },
      };

      const messageConfig = reminderMessages[reminder.reminderType];

      const taskProgressData = isProject
        ? progress.mainTasks?.map((mainTask: any) => ({
            mainTaskId: mainTask.id,
            mainTaskTitle: mainTask.title,
            subtasks: mainTask.subtasks?.map((st: any) => ({
              id: st.id,
              title: st.title,
              completed: st.completed || false,
            })) || [],
            completed: mainTask.completed || false,
            totalTasks: mainTask.subtasks?.length || 0,
            completedCount: mainTask.subtasks?.filter((st: any) => st.completed).length || 0,
          })) || []
        : [
            {
              subtasks: progress.subtasks?.map((st: any) => ({
                id: st.id,
                title: st.title,
                completed: st.completed || false,
              })) || [],
              completed: progress.subtasks?.every((st: any) => st.completed),
              totalTasks: progress.subtasks?.length || 0,
              completedCount: progress.subtasks?.filter((st: any) => st.completed).length || 0,
            },
          ];

      const notification = new Notification({
        studentId: payload.userId,
        projectId: reminder.projectId,
        taskId: reminder.taskId,
        type: 'project_reminder',
        reminderPercentage: reminder.reminderPercentage,
        title: messageConfig.title,
        message: messageConfig.message,
        description: messageConfig.description,
        taskProgress: taskProgressData,
        isRead: false,
        isSent: true,
        sentAt: now,
        scheduledFor: reminder.scheduledFor,
      });

      await notification.save();
      await ScheduledReminder.updateOne({ _id: reminder._id }, { isProcessed: true });
    }

    const notifications = await Notification.find({
      studentId: payload.userId,
    })
      .sort({ sentAt: -1 })
      .limit(50);

    return successResponse('Notifications retrieved', { notifications }, 200);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return serverErrorResponse('An error occurred while fetching notifications');
  }
}