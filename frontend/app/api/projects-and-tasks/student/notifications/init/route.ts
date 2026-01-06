import { NextResponse } from 'next/server';
import { startNotificationCron } from '@/lib/projects-and-tasks/reminders/notificationCron';

let cronStarted = false;

export async function GET() {
  if (!cronStarted) {
    startNotificationCron();
    cronStarted = true;
    return NextResponse.json({ message: 'Cron started' });
  }
  return NextResponse.json({ message: 'Cron already running' });
}