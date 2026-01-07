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

    // Find goal and verify ownership
    const goal = await LearningGoal.findOne({
      _id: goalId,
      studentId: payload.userId,
    });

    if (!goal) {
      return notFoundResponse('Goal not found');
    }

    // Update fields
    if (body.title !== undefined) goal.title = body.title;
    if (body.description !== undefined) goal.description = body.description;
    if (body.category !== undefined) goal.category = body.category;
    if (body.targetDate !== undefined) goal.targetDate = new Date(body.targetDate);
    if (body.priority !== undefined) goal.priority = body.priority;
    if (body.status !== undefined) goal.status = body.status;
    if (body.progress !== undefined) {
      goal.progress = Math.min(100, Math.max(0, body.progress));
      
      // Auto-complete if progress reaches 100%
      if (goal.progress === 100 && goal.status !== 'completed') {
        goal.status = 'completed';
        goal.completedAt = new Date();
      }
    }
    if (body.milestones !== undefined) goal.milestones = body.milestones;
    if (body.tags !== undefined) goal.tags = body.tags;
    if (body.courseId !== undefined) goal.courseId = body.courseId;

    await goal.save();

    return successResponse('Goal updated successfully', { goal }, 200);
  } catch (error: any) {
    console.error('Update goal error:', error);
    return serverErrorResponse('An error occurred while updating goal');
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