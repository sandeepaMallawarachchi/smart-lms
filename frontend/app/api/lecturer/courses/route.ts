// /api/lecturer/courses/route.ts

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Course from '@/model/Course';
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

    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Unauthorized access - Only lecturers can access this endpoint');
    }

    const lecturerId = payload.userId;

    // Find all courses where the lecturer is either:
    // 1. The lecturer in charge (lecturerInCharge)
    // 2. In the lecturers array
    const courses = await Course.find({
      $or: [
        { lecturerInCharge: lecturerId },
        { lecturers: lecturerId },
      ],
      isArchived: false,
    })
      .populate('lecturerInCharge', 'name email position')
      .populate('lecturers', 'name email position')
      .sort({ courseName: 1 })
      .lean();

    return successResponse('Courses retrieved successfully', {
      courses,
      count: courses.length,
    }, 200);
  } catch (error: any) {
    console.error('Get lecturer courses error:', error);
    return serverErrorResponse('An error occurred while fetching courses');
  }
}