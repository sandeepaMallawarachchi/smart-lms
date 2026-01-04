// /api/auth/verify/route.ts

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
import Lecturer from '@/model/Lecturer';
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

    // Check if user is superadmin
    if (payload.userRole === 'superadmin') {
      const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
      
      return successResponse('User verified', {
        user: {
          email: ADMIN_USERNAME || '',
          role: 'superadmin',
          name: 'Super Admin',
          userId: 'superadmin',
        },
        userRole: 'superadmin',
        isSuperAdmin: true,
      }, 200);
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
      isSuperAdmin: false,
    }, 200);
  } catch (error: any) {
    console.error('Verify user error:', error);
    return serverErrorResponse('An error occurred while verifying user');
  }
}