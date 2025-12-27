import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Lecturer from '@/model/Lecturer';
import { verifyToken } from '@/lib/jwt';
import { successResponse, unauthorizedResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
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
    const { lecturerId, action } = body;

    if (!lecturerId || !action) {
      return errorResponse('Validation failed', {
        lecturerId: !lecturerId ? ['Lecturer ID is required'] : [],
        action: !action ? ['Action is required'] : [],
      }, 400);
    }

    if (action === 'approve') {
      const lecturer = await Lecturer.findByIdAndUpdate(
        lecturerId,
        { isApproved: true },
        { new: true }
      ).select('-password');

      if (!lecturer) {
        return errorResponse('Lecturer not found', {}, 404);
      }

      return successResponse('Lecturer approved successfully', { lecturer }, 200);
    } else if (action === 'reject') {
      const lecturer = await Lecturer.findByIdAndDelete(lecturerId);

      if (!lecturer) {
        return errorResponse('Lecturer not found', {}, 404);
      }

      return successResponse('Lecturer rejected and removed', {}, 200);
    } else {
      return errorResponse('Invalid action', { action: ['Action must be approve or reject'] }, 400);
    }
  } catch (error: any) {
    console.error('Approve/reject lecturer error:', error);
    return serverErrorResponse('An error occurred while processing the request');
  }
}