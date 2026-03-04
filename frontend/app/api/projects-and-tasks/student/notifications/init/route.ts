import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Cron-based reminders are deprecated. Start `npm run worker:notifications` for queue-driven notifications.',
  });
}
