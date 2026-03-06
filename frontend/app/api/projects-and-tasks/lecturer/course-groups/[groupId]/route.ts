import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import Course from '@/model/Course';
import CourseGroup from '@/model/CourseGroup';
import { getEligibleStudentsForCourse } from '@/lib/course-students';

type StudentLite = { _id: { toString(): string } } & Record<string, unknown>;
type GroupInputBody = {
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
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

    const { groupId } = await params;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return errorResponse('Invalid group ID', { groupId: ['Invalid group ID'] }, 400);
    }

    const existingGroup = await CourseGroup.findOne({ _id: groupId, isArchived: false });
    if (!existingGroup) {
      return errorResponse('Group not found', { group: ['Group not found'] }, 404);
    }

    if (payload.userRole === 'lecture') {
      const hasAccess = await assertLecturerCourseAccess(existingGroup.courseId, payload.userId);
      if (!hasAccess) {
        return unauthorizedResponse('You do not have access to this course');
      }
    }

    const body = (await request.json()) as GroupInputBody;
    const groupName = body.groupName?.trim() || '';
    const requestedStudentIds: string[] = Array.isArray(body.studentIds)
      ? body.studentIds.map((id) => id?.toString() || '').filter(Boolean)
      : [];

    if (!groupName) {
      return errorResponse('Group name is required', { groupName: ['Group name is required'] }, 400);
    }
    if (requestedStudentIds.length === 0) {
      return errorResponse('At least one student is required', { studentIds: ['Select at least one student'] }, 400);
    }

    const courseAndStudents = await getEligibleStudentsForCourse(existingGroup.courseId);
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

    existingGroup.groupName = groupName;
    existingGroup.studentIds = normalizedStudentIds;
    await existingGroup.save();

    return successResponse('Course group updated successfully', { group: existingGroup }, 200);
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
    console.error('Update lecturer course group error:', error);
    return serverErrorResponse('An error occurred while updating course group');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
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

    const { groupId } = await params;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return errorResponse('Invalid group ID', { groupId: ['Invalid group ID'] }, 400);
    }

    const existingGroup = await CourseGroup.findOne({ _id: groupId, isArchived: false });
    if (!existingGroup) {
      return errorResponse('Group not found', { group: ['Group not found'] }, 404);
    }

    if (payload.userRole === 'lecture') {
      const hasAccess = await assertLecturerCourseAccess(existingGroup.courseId, payload.userId);
      if (!hasAccess) {
        return unauthorizedResponse('You do not have access to this course');
      }
    }

    existingGroup.isArchived = true;
    await existingGroup.save();

    return successResponse('Course group deleted successfully', {}, 200);
  } catch (error: unknown) {
    console.error('Delete lecturer course group error:', error);
    return serverErrorResponse('An error occurred while deleting course group');
  }
}
