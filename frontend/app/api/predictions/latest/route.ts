import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Prediction from '@/model/Prediction';
import { successResponse, notFoundResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload || payload.userRole !== 'student') {
      return unauthorizedResponse('Unauthorized');
    }

    // Get latest prediction for this student
    const prediction = await Prediction.findOne({ studentId: payload.userId })
      .populate('studentId', 'name email studentIdNumber')
      .sort({ createdAt: -1 })
      .lean();

    if (!prediction) {
      return notFoundResponse('No predictions found for this student');
    }

    return successResponse('Latest prediction retrieved successfully', {
      prediction,
    }, 200);
  } catch (error: any) {
    console.error('Get latest prediction error:', error);
    return serverErrorResponse('An error occurred while fetching latest prediction');
  }
}