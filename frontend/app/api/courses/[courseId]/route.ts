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

    // Allow superadmin or lecture to access
    if (!payload || !['superadmin', 'lecture'].includes(payload.userRole)) {
      return unauthorizedResponse('Unauthorized access');
    }

    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return notFoundResponse('Invalid course ID');
    }

    // Find the course
    const course = await Course.findById(courseId)
      .populate('lecturerInCharge', 'name email position')
      .populate('lecturers', 'name email position')
      .lean();

    if (!course) {
      return notFoundResponse('Course not found');
    }

    const students = await Student.find({
      academicYear: course.year.toString(),
      semester: course.semester.toString(),
      specialization: { $in: course.specializations },
      isVerified: true,
    })
      .select('studentIdNumber name email gender dateOfBirth academicYear semester specialization isVerified')
      .sort({ name: 1 })
      .lean();

    // Group students by specialization
    const studentsBySpecialization = course.specializations.reduce((acc: any, spec: string) => {
      acc[spec] = students.filter(s => s.specialization === spec);
      return acc;
    }, {});

    return successResponse('Students retrieved successfully', {
      course: {
        _id: course._id,
        courseName: course.courseName,
        year: course.year,
        semester: course.semester,
        specializations: course.specializations,
        credits: course.credits,
      },
      students,
      totalStudents: students.length,
      studentsBySpecialization,
      specializationBreakdown: course.specializations.map((spec: string) => ({
        specialization: spec,
        count: studentsBySpecialization[spec]?.length || 0,
      })),
    }, 200);
  } catch (error: any) {
    console.error('Get students by course error:', error);
    return serverErrorResponse('An error occurred while fetching students');
  }
}