import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
import Course from '@/model/Course';
import { successResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    await connectDB();

    const { courseId } = await params;

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

    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return notFoundResponse('Invalid course ID');
    }

    // Get student details
    const student = await Student.findById(payload.userId);

    if (!student) {
      return notFoundResponse('Student not found');
    }

    // Find the course
    const course = await Course.findById(courseId)
      .populate('lecturerInCharge', 'name email position')
      .populate('lecturers', 'name email position')
      .lean();

    if (!course) {
      return notFoundResponse('Course not found');
    }

    // Check if student is eligible for this course
    const isEligible = 
      course.year === parseInt(student.academicYear) &&
      course.semester === parseInt(student.semester) &&
      course.specializations.includes(student.specialization || '');

    return successResponse('Course retrieved successfully', {
      course,
      student: {
        id: student._id,
        name: student.name,
        studentIdNumber: student.studentIdNumber,
        academicYear: student.academicYear,
        semester: student.semester,
        specialization: student.specialization,
      },
      isEligible,
      eligibilityReason: !isEligible ? {
        yearMatch: course.year === parseInt(student.academicYear),
        semesterMatch: course.semester === parseInt(student.semester),
        specializationMatch: course.specializations.includes(student.specialization || ''),
      } : null,
    }, 200);
  } catch (error: any) {
    console.error('Get course by student error:', error);
    return serverErrorResponse('An error occurred while fetching course');
  }
}