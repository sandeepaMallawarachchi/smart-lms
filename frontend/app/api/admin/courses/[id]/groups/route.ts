import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import CourseGroup from '@/model/CourseGroup';
import { getEligibleStudentsForCourse } from '@/lib/course-students';

type StudentLite = { _id: { toString(): string } } & Record<string, unknown>;
type CourseGroupLite = { studentIds?: string[] } & Record<string, unknown>;
type CreateGroupBody = {
  groupName?: string;
  studentIds?: unknown[];
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: courseId } = await params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return errorResponse('Invalid course ID', { courseId: ['Invalid course ID'] }, 400);
    }

    const courseAndStudents = await getEligibleStudentsForCourse(courseId);
    if (!courseAndStudents) {
      return errorResponse('Course not found', { course: ['Course not found'] }, 404);
    }

    const groups = await CourseGroup.find({
      courseId,
      isArchived: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    const studentById = new Map(
      (courseAndStudents.students as StudentLite[]).map((student) => [student._id.toString(), student])
    );

    const groupsWithStudents = (groups as CourseGroupLite[]).map((group) => ({
      ...group,
      students: (group.studentIds || [])
        .map((studentId: string) => studentById.get(studentId))
        .filter(Boolean),
    }));

    return successResponse(
      'Course groups retrieved successfully',
      {
        course: {
          _id: courseAndStudents.course._id,
          courseName: courseAndStudents.course.courseName,
          year: courseAndStudents.course.year,
          semester: courseAndStudents.course.semester,
          specializations: courseAndStudents.course.specializations,
        },
        eligibleStudents: courseAndStudents.students,
        groups: groupsWithStudents,
      },
      200
    );
  } catch (error: unknown) {
    console.error('Get course groups error:', error);
    return serverErrorResponse('An error occurred while fetching course groups');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: courseId } = await params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return errorResponse('Invalid course ID', { courseId: ['Invalid course ID'] }, 400);
    }

    const body = (await request.json()) as CreateGroupBody;
    const groupName = body.groupName?.trim();
    const requestedStudentIds: string[] = Array.isArray(body.studentIds)
      ? body.studentIds.map((id) => id?.toString() || '')
          .filter(Boolean)
      : [];

    if (!groupName) {
      return errorResponse('Group name is required', { groupName: ['Group name is required'] }, 400);
    }
    if (requestedStudentIds.length === 0) {
      return errorResponse('At least one student is required', { studentIds: ['Select at least one student'] }, 400);
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
    console.error('Create course group error:', error);
    return serverErrorResponse('An error occurred while creating the course group');
  }
}
