import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import { getStudentProgressReportData } from '@/lib/learning-analytics/student-report-data';

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

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '200', 10);
    const data = await getStudentProgressReportData({
      studentId: payload.userId,
      limit,
    });

    return successResponse('Student progress report generated successfully', data);
  } catch (error: unknown) {
    console.error('Student report API error:', error);
    return serverErrorResponse('Failed to generate student progress report');
  }
}

