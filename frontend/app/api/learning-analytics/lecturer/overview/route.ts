import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import { getLecturerScopedData } from '@/lib/learning-analytics/lecturer-analytics';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Unauthorized');
    }

    const data = await getLecturerScopedData(payload.userId);

    return successResponse('Lecturer overview loaded successfully', {
      overview: data.overview,
      topAtRiskStudents: data.studentInsights
        .sort((a, b) => b.riskProbability - a.riskProbability)
        .slice(0, 8),
    });
  } catch (error: unknown) {
    console.error('Lecturer overview error:', error);
    return serverErrorResponse('An error occurred while loading lecturer overview');
  }
}
