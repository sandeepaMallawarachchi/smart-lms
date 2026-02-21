import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { NOTIFICATION_QUEUE_NAME, ReminderJobPayload } from './jobTypes';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const queueConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const notificationQueue = new Queue<ReminderJobPayload>(NOTIFICATION_QUEUE_NAME, {
  connection: queueConnection,
});

export function getReminderJobId(payload: {
  studentId: string;
  projectId?: string;
  taskId?: string;
  reminderType: string;
}) {
  const itemId = payload.projectId || payload.taskId || 'unknown';
  return `reminder:${payload.studentId}:${itemId}:${payload.reminderType}`;
}

export function getReminderJobPrefix(payload: {
  studentId: string;
  projectId?: string;
  taskId?: string;
}) {
  const itemId = payload.projectId || payload.taskId || 'unknown';
  return `reminder:${payload.studentId}:${itemId}:`;
}

export async function removeReminderJobsByPrefix(prefix: string): Promise<number> {
  const states = ['delayed', 'waiting', 'active', 'paused', 'prioritized'] as const;
  const jobs = await notificationQueue.getJobs(states, 0, -1, true);
  const removable = jobs.filter((job) => typeof job.id === 'string' && job.id.startsWith(prefix));

  await Promise.all(
    removable.map(async (job) => {
      try {
        await job.remove();
      } catch (error) {
        // Ignore race where job may complete between listing and removal.
      }
    })
  );

  return removable.length;
}
