import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { connectDB } from '@/lib/db';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { buildStudentReportData } from '@/lib/learning-analytics/report-data';

type ReportRange = 'weekly' | 'monthly' | 'all';

const parseRange = (value: string | null): ReportRange => {
  if (value === 'weekly' || value === 'monthly' || value === 'all') return value;
  return 'monthly';
};

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
      return unauthorizedResponse('Unauthorized');
    }

    const range = parseRange(request.nextUrl.searchParams.get('range'));
    const reportData = await buildStudentReportData(payload.userId, range);

    return successResponse('Student report generated successfully', reportData, 200);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Student not found') {
      return errorResponse('Student not found', { studentId: ['Student does not exist'] }, 404);
    }
    console.error('Generate report error:', error);
    return serverErrorResponse('An error occurred while generating report');
  }
}
