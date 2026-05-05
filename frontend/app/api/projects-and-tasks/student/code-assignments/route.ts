import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import Student from '@/model/Student';
import Course from '@/model/Course';
import { CodeAssignment } from '@/model/projects-and-tasks/lecturer/CodeAssignement';
import {
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'student') {
      return unauthorizedResponse('Unauthorized access');
    }

    const student = await Student.findById(payload.userId).lean();
    if (!student) {
      return notFoundResponse('Student not found');
    }

    const assignedCourses = await Course.find({
      year: parseInt(student.academicYear),
      semester: parseInt(student.semester),
      specializations: student.specialization,
      isArchived: false,
    })
      .select('_id courseName courseCode year semester specializations')
      .sort({ courseName: 1 })
      .lean();

    const assignedCourseIds = assignedCourses.map((course) => course._id.toString());
    const requestedCourseId = request.nextUrl.searchParams.get('courseId');

    if (requestedCourseId && !assignedCourseIds.includes(requestedCourseId)) {
      return unauthorizedResponse('You do not have access to this course');
    }

    const targetCourseIds = requestedCourseId ? [requestedCourseId] : assignedCourseIds;

    if (targetCourseIds.length === 0) {
      return successResponse(
        'No assigned courses found for this student',
        {
          student: {
            id: student._id,
            name: student.name,
            studentIdNumber: student.studentIdNumber,
            academicYear: student.academicYear,
            semester: student.semester,
            specialization: student.specialization,
          },
          courses: [],
          assignments: [],
          totalCourses: 0,
          totalAssignments: 0,
        },
        200
      );
    }

    const assignments = await CodeAssignment.find({
      courseId: { $in: targetCourseIds },
      projectType: 'code',
    })
      .sort({ createdAt: -1 })
      .lean();

    const assignmentCountByCourse = new Map<string, number>();
    for (const assignment of assignments) {
      const key = assignment.courseId.toString();
      assignmentCountByCourse.set(key, (assignmentCountByCourse.get(key) || 0) + 1);
    }

    const coursesWithCounts = assignedCourses
      .filter((course) => assignmentCountByCourse.has(course._id.toString()) || !requestedCourseId)
      .map((course) => ({
        ...course,
        assignmentCount: assignmentCountByCourse.get(course._id.toString()) || 0,
      }));

    return successResponse(
      'Code assignments retrieved successfully',
      {
        student: {
          id: student._id,
          name: student.name,
          studentIdNumber: student.studentIdNumber,
          academicYear: student.academicYear,
          semester: student.semester,
          specialization: student.specialization,
        },
        courses: coursesWithCounts,
        assignments,
        totalCourses: coursesWithCounts.length,
        totalAssignments: assignments.length,
      },
      200
    );
  } catch (error: any) {
    console.error('Get student code assignments error:', error);
    return serverErrorResponse('An error occurred while fetching code assignments');
  }
}
