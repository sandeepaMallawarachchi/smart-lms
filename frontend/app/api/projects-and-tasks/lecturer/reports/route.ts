import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import { assertLecturerCourseAccess, buildLecturerReport, ReportItemType } from '@/lib/projects-and-tasks/lecturerReports';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Unauthorized access - Only lecturers can access this endpoint');
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId') || '';
    const itemType = (searchParams.get('itemType') || 'all') as ReportItemType;
    const studentId = searchParams.get('studentId') || undefined;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return errorResponse('Valid course ID is required', { courseId: ['Course ID is required'] }, 400);
    }
    if (!['all', 'project', 'task'].includes(itemType)) {
      return errorResponse('Invalid itemType', { itemType: ['Valid values: all, project, task'] }, 400);
    }

    const hasAccess = await assertLecturerCourseAccess(courseId, payload.userId);
    if (!hasAccess) {
      return unauthorizedResponse('You do not have access to this module');
    }

    let report;
    try {
      report = await buildLecturerReport({ courseId, itemType, studentId });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_STUDENT') {
        return errorResponse('Invalid student for selected module', { studentId: ['Student is not in this module'] }, 400);
      }
      throw error;
    }

    if (!report) {
      return errorResponse('Module not found', { course: ['Module not found'] }, 404);
    }

    return successResponse('Lecturer report retrieved successfully', report, 200);
  } catch (error: unknown) {
    console.error('Get lecturer report error:', error);
    return serverErrorResponse('An error occurred while building the report');
  }
}
