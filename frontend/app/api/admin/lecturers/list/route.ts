import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Lecturer from '@/model/Lecturer';
import { verifyToken } from '@/lib/jwt';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload || payload.userRole !== 'superadmin') {
      return unauthorizedResponse('Unauthorized access');
    }

    const lecturers = await Lecturer.find({ isVerified: true })
      .select('_id name email position department')
      .sort({ name: 1 })
      .lean();

    return successResponse('Lecturers retrieved successfully', { lecturers }, 200);
  } catch (error: any) {
    console.error('Get lecturers error:', error);
    return serverErrorResponse('An error occurred while fetching lecturers');
  }
}