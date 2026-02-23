import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import Course from '@/model/Course';
import CourseGroup from '@/model/CourseGroup';
import Student from '@/model/Student';
import { getEligibleStudentsForCourse } from '@/lib/course-students';

type GroupLite = { studentIds?: string[] } & Record<string, unknown>;
type StudentLite = { _id: { toString(): string } } & Record<string, unknown>;
type GroupInputBody = {
  courseId?: string;
  groupName?: string;
  studentIds?: unknown[];
};

async function assertLecturerCourseAccess(courseId: string, lecturerId: string) {
  const hasAccess = await Course.exists({
    _id: courseId,
    $or: [{ lecturerInCharge: lecturerId }, { lecturers: lecturerId }],
  });
  return Boolean(hasAccess);
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);
    if (!payload || !['lecture', 'superadmin'].includes(payload.userRole)) {
      return unauthorizedResponse('Unauthorized access');
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return errorResponse('Valid course ID is required', { courseId: ['Course ID is required'] }, 400);
    }

    if (payload.userRole === 'lecture') {
      const hasAccess = await assertLecturerCourseAccess(courseId, payload.userId);
      if (!hasAccess) {
        return unauthorizedResponse('You do not have access to this course');
      }
    }

    const groups = await CourseGroup.find({
      courseId,
      isArchived: false,
    })
      .sort({ groupName: 1 })
      .lean();

    const allStudentIds = [
      ...new Set((groups as GroupLite[]).flatMap((group) => group.studentIds || [])),
    ];
    const students = allStudentIds.length
      ? await Student.find({ _id: { $in: allStudentIds } })
          .select('_id name studentIdNumber email specialization')
          .lean()
      : [];

    const studentById = new Map(
      (students as StudentLite[]).map((student) => [student._id.toString(), student])
    );
    const groupsWithStudents = (groups as GroupLite[]).map((group) => ({
      ...group,
      students: (group.studentIds || [])
        .map((studentId: string) => studentById.get(studentId))
        .filter(Boolean),
    }));

    const courseAndStudents = await getEligibleStudentsForCourse(courseId);
    const eligibleStudents = courseAndStudents?.students || [];

    return successResponse(
      'Course groups retrieved successfully',
      { groups: groupsWithStudents, eligibleStudents },
      200
    );
  } catch (error: unknown) {
    console.error('Get lecturer course groups error:', error);
    return serverErrorResponse('An error occurred while fetching course groups');
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);
    if (!payload || !['lecture', 'superadmin'].includes(payload.userRole)) {
      return unauthorizedResponse('Unauthorized access');
    }

    const body = (await request.json()) as GroupInputBody;
    const courseId = body.courseId?.toString() || '';
    const groupName = body.groupName?.trim() || '';
    const requestedStudentIds: string[] = Array.isArray(body.studentIds)
      ? body.studentIds.map((id) => id?.toString() || '').filter(Boolean)
      : [];

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return errorResponse('Valid course ID is required', { courseId: ['Course ID is required'] }, 400);
    }
    if (!groupName) {
      return errorResponse('Group name is required', { groupName: ['Group name is required'] }, 400);
    }
    if (requestedStudentIds.length === 0) {
      return errorResponse('At least one student is required', { studentIds: ['Select at least one student'] }, 400);
    }

    if (payload.userRole === 'lecture') {
      const hasAccess = await assertLecturerCourseAccess(courseId, payload.userId);
      if (!hasAccess) {
        return unauthorizedResponse('You do not have access to this course');
      }
    }

    const courseAndStudents = await getEligibleStudentsForCourse(courseId);
    if (!courseAndStudents) {
      return errorResponse('Course not found', { course: ['Course not found'] }, 404);
    }

    const eligibleStudentIds = new Set(
      (courseAndStudents.students as StudentLite[]).map((student) => student._id.toString())
    );
    const normalizedStudentIds = [...new Set(requestedStudentIds)];
    const invalidStudentIds = normalizedStudentIds.filter((id) => !eligibleStudentIds.has(id));
    if (invalidStudentIds.length > 0) {
      return errorResponse(
        'Some selected students are not eligible for this course',
        { studentIds: ['Selected students must belong to this course'] },
        400
      );
    }

    const group = await CourseGroup.create({
      courseId,
      groupName,
      studentIds: normalizedStudentIds,
      createdBy: payload.userId,
    });

    return successResponse('Course group created successfully', { group }, 201);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      return errorResponse(
        'A group with this name already exists for this course',
        { groupName: ['Group name must be unique per course'] },
        409
      );
    }
    console.error('Create lecturer course group error:', error);
    return serverErrorResponse('An error occurred while creating course group');
  }
}
