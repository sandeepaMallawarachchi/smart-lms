import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import CourseGroup from '@/model/CourseGroup';
import { getEligibleStudentsForCourse } from '@/lib/course-students';

type StudentLite = { _id: { toString(): string } } & Record<string, unknown>;
type UpdateGroupBody = {
  groupName?: string;
  studentIds?: unknown[];
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
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

    const { id: courseId, groupId } = await params;
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(groupId)) {
      return errorResponse('Invalid ID', { id: ['Invalid ID'] }, 400);
    }

    const existingGroup = await CourseGroup.findOne({ _id: groupId, courseId, isArchived: false });
    if (!existingGroup) {
      return errorResponse('Group not found', { group: ['Group not found'] }, 404);
    }

    const body = (await request.json()) as UpdateGroupBody;
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
    console.error('Update course group error:', error);
    return serverErrorResponse('An error occurred while updating the course group');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
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

    const { id: courseId, groupId } = await params;
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(groupId)) {
      return errorResponse('Invalid ID', { id: ['Invalid ID'] }, 400);
    }

    const group = await CourseGroup.findOneAndUpdate(
      { _id: groupId, courseId, isArchived: false },
      { isArchived: true },
      { new: true }
    );

    if (!group) {
      return errorResponse('Group not found', { group: ['Group not found'] }, 404);
    }

    return successResponse('Course group deleted successfully', {}, 200);
  } catch (error: unknown) {
    console.error('Delete course group error:', error);
    return serverErrorResponse('An error occurred while deleting the course group');
  }
}
