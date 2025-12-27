import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Course from '@/model/Course';
import { verifyToken } from '@/lib/jwt';
import { successResponse, unauthorizedResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await request.json();
    const { courseName, credits, year, semester, lecturerInCharge, lecturers } = body;

    const course = await Course.findByIdAndUpdate(
      params.id,
      {
        courseName,
        credits,
        year,
        semester,
        lecturerInCharge,
        lecturers,
      },
      { new: true }
    )
      .populate('lecturerInCharge', 'name email position')
      .populate('lecturers', 'name email position');

    if (!course) {
      return errorResponse('Course not found', {}, 404);
    }

    return successResponse('Course updated successfully', { course }, 200);
  } catch (error: any) {
    console.error('Update course error:', error);
    return serverErrorResponse('An error occurred while updating the course');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const course = await Course.findByIdAndDelete(params.id);

    if (!course) {
      return errorResponse('Course not found', {}, 404);
    }

    return successResponse('Course deleted successfully', {}, 200);
  } catch (error: any) {
    console.error('Delete course error:', error);
    return serverErrorResponse('An error occurred while deleting the course');
  }
}