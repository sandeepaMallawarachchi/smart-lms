import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/projects-and-tasks/Student';
import Lecturer from '@/model/projects-and-tasks/Lecture';
import { verifyToken } from '@/lib/jwt';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
      return unauthorizedResponse('Invalid or expired token');
    }

    // Fetch user based on role
    let user;

    if (payload.userRole === 'student') {
      user = await Student.findById(payload.userId);
    } else if (payload.userRole === 'lecture') {
      user = await Lecturer.findById(payload.userId);
    }

    if (!user) {
      return unauthorizedResponse('User not found');
    }

    const userData = user.toObject();
    delete userData.password;

    return successResponse('User verified', {
      user: userData,
      userRole: payload.userRole,
    }, 200);
  } catch (error: any) {
    console.error('Verify user error:', error);
    return serverErrorResponse('An error occurred while verifying user');
  }
}