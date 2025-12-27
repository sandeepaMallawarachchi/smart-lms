import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let users = [];

    if (type === 'students' || !type) {
      const students = await Student.find().select('-password').lean();
      users.push(...students.map(s => ({ ...s, userType: 'student' })));
    }

    if (type === 'lecturers' || !type) {
      const lecturers = await Lecturer.find().select('-password').lean();
      users.push(...lecturers.map(l => ({ ...l, userType: 'lecturer' })));
    }

    return successResponse('Users retrieved successfully', {
      users,
      total: users.length,
    }, 200);
  } catch (error: any) {
    console.error('Get users error:', error);
    return serverErrorResponse('An error occurred while fetching users');
  }
}