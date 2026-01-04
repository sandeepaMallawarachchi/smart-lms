// /app/api/student/get-courses/route.ts

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
import Course from '@/model/Course';
import { successResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';
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
      return unauthorizedResponse('Unauthorized access');
    }

    // Get student details
    const student = await Student.findById(payload.userId);

    if (!student) {
      return notFoundResponse('Student not found');
    }

    const courses = await Course.find({
      year: parseInt(student.academicYear),
      semester: parseInt(student.semester),
      specializations: student.specialization,
      isArchived: false,
    })
      .populate('lecturerInCharge', 'name email position')
      .populate('lecturers', 'name email position')
      .sort({ courseName: 1 })
      .lean();

    return successResponse('Courses retrieved successfully', {
      student: {
        id: student._id,
        name: student.name,
        studentIdNumber: student.studentIdNumber,
        academicYear: student.academicYear,
        semester: student.semester,
        specialization: student.specialization,
      },
      courses,
      totalCourses: courses.length,
    }, 200);
  } catch (error: any) {
    console.error('Get student courses error:', error);
    return serverErrorResponse('An error occurred while fetching courses');
  }
}