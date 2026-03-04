import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import { getLecturerReportData } from '@/lib/learning-analytics/lecturer-report-data';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Unauthorized');
    }

    const params = request.nextUrl.searchParams;
    const courseId = params.get('courseId') || undefined;
    const year = params.get('year') || undefined;
    const semester = params.get('semester') || undefined;
    const specialization = params.get('specialization') || undefined;
    const limit = parseInt(params.get('limit') || '200', 10);
    const recommendationLimit = parseInt(params.get('recommendationLimit') || '8', 10);

    const chatbotBaseUrl =
      process.env.CHATBOT_BASE_URL ||
      (process.env.CHATBOT_URL ? process.env.CHATBOT_URL.replace(/\/chat\/?$/, '') : '') ||
      'http://localhost:5001';

    const data = await getLecturerReportData(chatbotBaseUrl, {
      lecturerId: payload.userId,
      courseId,
      year,
      semester,
      specialization,
      limit,
      recommendationLimit,
    });

    return successResponse('Lecturer report generated successfully', data);
  } catch (error: unknown) {
    console.error('Lecturer report API error:', error);
    return serverErrorResponse('Failed to generate lecturer report');
  }
}

