import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { StudentTaskProgress, Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import Course from '@/model/Course';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response';
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

        // Get all task progresses for this student
        const progresses = await StudentTaskProgress.find({
            studentId: payload.userId,
        }).sort({ updatedAt: -1 });

        // Get all related tasks with course info
        const taskIds = progresses.map(p => p.taskId);
        const tasks = await Task.find({ _id: { $in: taskIds } });

        // Combine progress with task details
        const enrichedProgresses = await Promise.all(
            progresses.map(async (progress) => {
                const task = tasks.find(t => t._id.toString() === progress.taskId);
                if (!task) return null;

                const course = await Course.findById(task.courseId);

                return {
                    taskId: progress.taskId,
                    taskName: task.taskName,
                    courseId: task.courseId,
                    courseName: course?.courseName || 'Unknown Course',
                    status: progress.status,
                    subtasks: progress.subtasks,
                    deadlineDate: task.deadlineDate,
                    deadlineTime: task.deadlineTime,
                    updatedAt: progress.updatedAt,
                };
            })
        );

        const validProgresses = enrichedProgresses.filter(p => p !== null);

        return successResponse('Tasks retrieved successfully', {
            tasks: validProgresses,
            total: validProgresses.length,
        }, 200);
    } catch (error: any) {
        console.error('Get tasks error:', error);
        return serverErrorResponse('An error occurred while fetching tasks');
    }
}