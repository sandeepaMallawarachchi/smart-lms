import { ReminderType } from './jobTypes';
import {
  getReminderJobId,
  getReminderJobPrefix,
  notificationQueue,
  removeReminderJobsByPrefix,
} from './notificationQueue';

function computeReminderScheduleTimes(deadline: Date, now: Date) {
  const totalMs = deadline.getTime() - now.getTime();
  if (totalMs <= 0) return [];

  const checkpoints = [25, 50, 75, 100] as const;
  return checkpoints.map((percentage) => {
    const offsetMs = Math.floor((totalMs * percentage) / 100);
    const scheduledFor = new Date(now.getTime() + offsetMs);
    return { percentage, scheduledFor };
  });
}

function resolveReminderType(itemType: 'project' | 'task', percentage: number): ReminderType {
  return `${itemType}_${percentage === 100 ? 'deadline' : percentage}` as ReminderType;
}

export async function cancelReminderJobsForStudentItem(input: {
  studentId: string;
  projectId?: string;
  taskId?: string;
}) {
  const prefix = getReminderJobPrefix(input);
  return removeReminderJobsByPrefix(prefix);
}

export async function scheduleReminderJobsForStudentItem(input: {
  studentId: string;
  itemType: 'project' | 'task';
  itemId: string;
  itemName: string;
  deadlineDate: string;
  deadlineTime?: string;
}) {
  const deadline = new Date(`${input.deadlineDate}T${input.deadlineTime || '23:59'}`);
  if (Number.isNaN(deadline.getTime())) {
    throw new Error('Invalid deadline date');
  }

  const now = new Date();
  const scheduleTimes = computeReminderScheduleTimes(deadline, now);
  await cancelReminderJobsForStudentItem({
    studentId: input.studentId,
    projectId: input.itemType === 'project' ? input.itemId : undefined,
    taskId: input.itemType === 'task' ? input.itemId : undefined,
  });

  const scheduled: Array<{
    jobId: string;
    reminderType: ReminderType;
    reminderPercentage: number;
    scheduledFor: Date;
  }> = [];

  for (const point of scheduleTimes) {
    const reminderType = resolveReminderType(input.itemType, point.percentage);
    const jobId = getReminderJobId({
      studentId: input.studentId,
      projectId: input.itemType === 'project' ? input.itemId : undefined,
      taskId: input.itemType === 'task' ? input.itemId : undefined,
      reminderType,
    });

    const delayMs = Math.max(0, point.scheduledFor.getTime() - Date.now());

    await notificationQueue.add(
      reminderType,
      {
        studentId: input.studentId,
        projectId: input.itemType === 'project' ? input.itemId : undefined,
        taskId: input.itemType === 'task' ? input.itemId : undefined,
        itemType: input.itemType,
        itemName: input.itemName,
        reminderType,
        reminderPercentage: point.percentage,
        deadlineDate: input.deadlineDate,
        deadlineTime: input.deadlineTime || '23:59',
        scheduledFor: point.scheduledFor.toISOString(),
      },
      {
        jobId,
        delay: delayMs,
        removeOnComplete: 500,
        removeOnFail: 1000,
      }
    );

    scheduled.push({
      jobId,
      reminderType,
      reminderPercentage: point.percentage,
      scheduledFor: point.scheduledFor,
    });
  }

  return scheduled;
}
