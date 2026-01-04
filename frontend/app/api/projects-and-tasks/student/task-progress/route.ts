import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { StudentTaskProgress, Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { successResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return unauthorizedResponse('No token provided');
        }

        const payload = verifyToken(token);

        if (!payload || payload.userRole !== 'student') {
            return unauthorizedResponse('Unauthorized access');
        }

        const taskId = request.nextUrl.searchParams.get('taskId');

        if (!taskId) {
            return notFoundResponse('Task ID is required');
        }

        let progress = await StudentTaskProgress.findOne({
            studentId: payload.userId,
            taskId,
        });

        if (!progress) {
            const task = await Task.findById(taskId);

            if (!task) {
                return notFoundResponse('Task not found');
            }

            progress = new StudentTaskProgress({
                studentId: payload.userId,
                taskId,
                status: 'todo',
                subtasks: task.subtasks.map((st: any) => ({
                    id: st.id,
                    title: st.title,
                    description: st.description,
                    completed: false,
                })),
            });

            await progress.save();
        }

        return successResponse('Task progress retrieved', { progress }, 200);
    } catch (error: any) {
        console.error('Get task progress error:', error);
        return serverErrorResponse('An error occurred while fetching task progress');
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

        if (!payload || payload.userRole !== 'student') {
            return unauthorizedResponse('Unauthorized access');
        }

        const body = await request.json();
        const { taskId, status, subtasks } = body;

        if (!taskId) {
            return notFoundResponse('Task ID is required');
        }

        let progress = await StudentTaskProgress.findOne({
            studentId: payload.userId,
            taskId,
        });

        if (!progress) {
            const task = await Task.findById(taskId);

            if (!task) {
                return notFoundResponse('Task not found');
            }

            progress = new StudentTaskProgress({
                studentId: payload.userId,
                taskId,
                status: status || 'todo',
                subtasks: task.subtasks.map((st: any) => ({
                    id: st.id,
                    title: st.title,
                    description: st.description,
                    completed: false,
                })),
            });
        } else {
            if (status) {
                progress.status = status;
            }
            if (subtasks) {
                progress.subtasks = subtasks;

                const allSubtasksCompleted = subtasks.every((st: any) => st.completed);
                if (allSubtasksCompleted && subtasks.length > 0) {
                    progress.status = 'done';
                }
            }
        }

        await progress.save();

        return successResponse('Task progress updated', { progress }, 200);
    } catch (error: any) {
        console.error('Update task progress error:', error);
        return serverErrorResponse('An error occurred while updating task progress');
    }
}