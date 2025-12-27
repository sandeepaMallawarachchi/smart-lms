import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
import Lecturer from '@/model/Lecturer';
import { verifyToken } from '@/lib/jwt';
import { successResponse, unauthorizedResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { userId, userType, action } = body;

    if (!userId || !userType || !action) {
      return errorResponse('Validation failed', {
        userId: !userId ? ['User ID is required'] : [],
        userType: !userType ? ['User type is required'] : [],
        action: !action ? ['Action is required'] : [],
      }, 400);
    }

    const Model = userType === 'student' ? Student : Lecturer;

    if (action === 'approve') {
      const user = await Model.findByIdAndUpdate(
        userId,
        { isVerified: true },
        { new: true }
      ).select('-password');

      if (!user) {
        return errorResponse('User not found', {}, 404);
      }

      return successResponse(`${userType === 'student' ? 'Student' : 'Lecturer'} approved successfully`, { user }, 200);
    } else if (action === 'reject') {
      const user = await Model.findByIdAndDelete(userId);

      if (!user) {
        return errorResponse('User not found', {}, 404);
      }

      return successResponse(`${userType === 'student' ? 'Student' : 'Lecturer'} rejected and removed`, {}, 200);
    } else {
      return errorResponse('Invalid action', { action: ['Action must be approve or reject'] }, 400);
    }
  } catch (error: any) {
    console.error('Approve/reject user error:', error);
    return serverErrorResponse('An error occurred while processing the request');
  }
}