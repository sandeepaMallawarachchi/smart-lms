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

    // Get pending students
    const pendingStudents = await Student.find({ isVerified: false })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    // Get pending lecturers
    const pendingLecturers = await Lecturer.find({ isVerified: false })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    // Combine and mark user types
    const pendingUsers = [
      ...pendingStudents.map(s => ({ ...s, userType: 'student' })),
      ...pendingLecturers.map(l => ({ ...l, userType: 'lecturer' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return successResponse('Pending approvals retrieved successfully', {
      pendingUsers,
      total: pendingUsers.length,
      students: pendingStudents.length,
      lecturers: pendingLecturers.length,
    }, 200);
  } catch (error: any) {
    console.error('Get pending approvals error:', error);
    return serverErrorResponse('An error occurred while fetching pending approvals');
  }
}