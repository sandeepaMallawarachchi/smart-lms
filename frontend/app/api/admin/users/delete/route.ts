import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
import Lecturer from '@/model/Lecturer';
import { verifyToken } from '@/lib/jwt';
import { successResponse, unauthorizedResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function DELETE(request: NextRequest) {
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
    const { userId, userType } = body;

    if (!userId || !userType) {
      return errorResponse('Validation failed', {
        userId: !userId ? ['User ID is required'] : [],
        userType: !userType ? ['User type is required'] : [],
      }, 400);
    }

    let deletedUser;

    if (userType === 'student') {
      deletedUser = await Student.findByIdAndDelete(userId);
    } else if (userType === 'lecturer') {
      deletedUser = await Lecturer.findByIdAndDelete(userId);
    } else {
      return errorResponse('Invalid user type', { userType: ['User type must be student or lecturer'] }, 400);
    }

    if (!deletedUser) {
      return errorResponse('User not found', {}, 404);
    }

    return successResponse('User deleted successfully', {}, 200);
  } catch (error: any) {
    console.error('Delete user error:', error);
    return serverErrorResponse('An error occurred while deleting the user');
  }
}