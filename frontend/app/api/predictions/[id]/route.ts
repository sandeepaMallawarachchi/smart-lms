import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Prediction from '@/model/Prediction';
import { successResponse, notFoundResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload) {
      return unauthorizedResponse('Unauthorized');
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return notFoundResponse('Invalid prediction ID');
    }

    // Fetch prediction
    const prediction = await Prediction.findById(id)
      .populate('studentId', 'name email studentIdNumber')
      .lean();

    if (!prediction) {
      return notFoundResponse('Prediction not found');
    }

    // If student role, check if they own this prediction
    if (payload.userRole === 'student' && prediction.studentId.toString() !== payload.userId) {
      return unauthorizedResponse('You do not have permission to view this prediction');
    }

    return successResponse('Prediction retrieved successfully', {
      prediction,
    }, 200);
  } catch (error: any) {
    console.error('Get prediction by ID error:', error);
    return serverErrorResponse('An error occurred while fetching prediction');
  }
}

// DELETE - Delete a prediction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload) {
      return unauthorizedResponse('Unauthorized');
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return notFoundResponse('Invalid prediction ID');
    }

    // Fetch prediction
    const prediction = await Prediction.findById(id);

    if (!prediction) {
      return notFoundResponse('Prediction not found');
    }

    // If student role, check if they own this prediction
    if (payload.userRole === 'student' && prediction.studentId.toString() !== payload.userId) {
      return unauthorizedResponse('You do not have permission to delete this prediction');
    }

    await prediction.deleteOne();

    return successResponse('Prediction deleted successfully', null, 200);
  } catch (error: any) {
    console.error('Delete prediction error:', error);
    return serverErrorResponse('An error occurred while deleting prediction');
  }
}