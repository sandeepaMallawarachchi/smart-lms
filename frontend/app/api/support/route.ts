import { NextRequest } from 'next/server';
import { errorResponse, serverErrorResponse, successResponse } from '@/lib/api-response';
import { sendSupportEmails } from '@/lib/support-email';

type SupportBody = {
  name?: string;
  studentId?: string;
  email?: string;
  subject?: string;
  message?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SupportBody;
    const name = body.name?.trim() || '';
    const studentId = body.studentId?.trim() || '';
    const email = body.email?.trim() || '';
    const subject = body.subject?.trim() || '';
    const message = body.message?.trim() || '';

    const errors: Record<string, string[]> = {};

    if (!name) errors.name = ['Name is required'];
    if (!studentId) errors.studentId = ['Student ID is required'];
    if (!email) errors.email = ['Email is required'];
    if (email && !isValidEmail(email)) errors.email = ['Enter a valid email address'];
    if (!subject) errors.subject = ['Subject is required'];
    if (!message) errors.message = ['Message is required'];
    if (message.length > 3000) errors.message = ['Message must be 3000 characters or fewer'];

    if (Object.keys(errors).length > 0) {
      return errorResponse('Please correct the form errors', errors, 400);
    }

    await sendSupportEmails({
      name,
      studentId,
      email,
      subject,
      message,
    });

    return successResponse('Support request sent successfully', undefined, 200);
  } catch (error) {
    console.error('Support request error:', error);
    return serverErrorResponse('Unable to send your support request right now');
  }
}
