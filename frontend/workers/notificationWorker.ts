import IORedis from 'ioredis';
import { QueueEvents, Worker } from 'bullmq';
import { loadEnvConfig } from '@next/env';
import {
  NOTIFICATION_QUEUE_NAME,
  ReminderJobPayload,
} from '../lib/projects-and-tasks/reminders/jobTypes';

// Worker runs outside Next.js runtime, so load env files manually.
loadEnvConfig(process.cwd());

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

const worker = new Worker<ReminderJobPayload>(
  NOTIFICATION_QUEUE_NAME,
  async (job) => {
    const { processReminderJob } = await import('../lib/projects-and-tasks/reminders/notificationProcessor');
    await processReminderJob(job.data);
  },
  {
    connection,
    concurrency: 10,
  }
);

const events = new QueueEvents(NOTIFICATION_QUEUE_NAME, { connection });

worker.on('ready', () => {
  console.log(`[NotificationWorker] listening on queue "${NOTIFICATION_QUEUE_NAME}"`);
});

worker.on('completed', (job) => {
  console.log(`[NotificationWorker] completed ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`[NotificationWorker] failed ${job?.id}:`, err.message);
});

events.on('waiting', ({ jobId }) => {
  console.log(`[NotificationWorker] queued ${jobId}`);
});

process.on('SIGINT', async () => {
  console.log('[NotificationWorker] shutting down...');
  await events.close();
  await worker.close();
  await connection.quit();
  process.exit(0);
});
