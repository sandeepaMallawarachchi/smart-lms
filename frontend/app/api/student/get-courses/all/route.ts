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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('filter');

    // Get student details
    const student = await Student.findById(payload.userId);

    if (!student) {
      return notFoundResponse('Student not found');
    }

    let query: any = { isArchived: false };

    switch (filterType) {
      case 'my-courses':
        query = {
          year: parseInt(student.academicYear),
          semester: parseInt(student.semester),
          specializations: student.specialization,
          isArchived: false,
        };
        break;

      case 'other-year':
        query = {
          year: { $ne: parseInt(student.academicYear) },
          semester: parseInt(student.semester),
          specializations: student.specialization,
          isArchived: false,
        };
        break;

      case 'other-semester':
        query = {
          year: parseInt(student.academicYear),
          semester: { $ne: parseInt(student.semester) },
          specializations: student.specialization,
          isArchived: false,
        };
        break;

      case 'all':
      default:
        // All non-archived courses
        query = { isArchived: false };
        break;
    }

    const courses = await Course.find(query)
      .populate('lecturerInCharge', 'name email position')
      .populate('lecturers', 'name email position')
      .sort({ year: 1, semester: 1, courseName: 1 })
      .lean();

    const coursesWithEligibility = courses.map((course: any) => ({
      ...course,
      isEligible: 
        course.year === parseInt(student.academicYear) &&
        course.semester === parseInt(student.semester) &&
        course.specializations.includes(student.specialization),
    }));

    return successResponse('Courses retrieved successfully', {
      student: {
        id: student._id,
        name: student.name,
        studentIdNumber: student.studentIdNumber,
        academicYear: student.academicYear,
        semester: student.semester,
        specialization: student.specialization,
      },
      courses: coursesWithEligibility,
      totalCourses: coursesWithEligibility.length,
      eligibleCourses: coursesWithEligibility.filter((c: any) => c.isEligible).length,
      filter: filterType || 'all',
    }, 200);
  } catch (error: any) {
    console.error('Get all courses error:', error);
    return serverErrorResponse('An error occurred while fetching courses');
  }
}