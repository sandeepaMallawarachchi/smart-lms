import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import LearningGoal from '@/model/learning-analytics/LearningGoal';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';
import mongoose from 'mongoose';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    await connectDB();

    const { goalId } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload || payload.userRole !== 'student') {
      return unauthorizedResponse('Unauthorized access');
    }

    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return notFoundResponse('Invalid goal ID');
    }

    const body = await request.json();

    const updateData: Record<string, any> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.targetDate !== undefined) updateData.targetDate = new Date(body.targetDate);
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) {
      if (body.status === 'active') updateData.status = 'todo';
      else if (body.status === 'completed') updateData.status = 'done';
      else if (body.status === 'overdue' || body.status === 'cancelled') updateData.status = 'todo';
      else updateData.status = body.status;
      if (!['todo', 'inprogress', 'done'].includes(updateData.status)) {
        return serverErrorResponse(`Invalid status value: ${String(updateData.status)}`);
      }
    }
    if (body.progress !== undefined && body.status === undefined) {
      const progress = Math.min(100, Math.max(0, body.progress));
      if (progress >= 100) updateData.status = 'done';
      else if (progress > 0) updateData.status = 'inprogress';
      else updateData.status = 'todo';
    }
    if (body.milestones !== undefined) updateData.milestones = body.milestones;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.courseId !== undefined) updateData.courseId = body.courseId;

    if (Object.keys(updateData).length === 0) {
      return successResponse('No updates provided', null, 200);
    }

    const statusOnlyUpdate = Object.keys(updateData).every((k) => k === 'status' || k === 'progress');

    const goal = await LearningGoal.findOneAndUpdate(
      { _id: goalId, studentId: payload.userId },
      { $set: updateData },
      { new: true, runValidators: !statusOnlyUpdate }
    );

    if (!goal) {
      return notFoundResponse('Goal not found');
    }

    return successResponse('Goal updated successfully', { goal }, 200);
  } catch (error: any) {
    console.error('Update goal error:', error);
    return serverErrorResponse(`An error occurred while updating goal: ${error?.message || 'Unknown error'}`);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    await connectDB();

    const { goalId } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload || payload.userRole !== 'student') {
      return unauthorizedResponse('Unauthorized access');
    }

    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return notFoundResponse('Invalid goal ID');
    }

    // Find and delete goal
    const goal = await LearningGoal.findOneAndDelete({
      _id: goalId,
      studentId: payload.userId,
    });

    if (!goal) {
      return notFoundResponse('Goal not found');
    }

    return successResponse('Goal deleted successfully', { goalId }, 200);
  } catch (error: any) {
    console.error('Delete goal error:', error);
    return serverErrorResponse('An error occurred while deleting goal');
  }
}
