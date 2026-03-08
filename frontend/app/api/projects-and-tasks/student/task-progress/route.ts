import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { StudentTaskProgress, Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { successResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';
import {
    cancelReminderJobsForStudentItem,
    scheduleReminderJobsForStudentItem,
} from '@/lib/projects-and-tasks/reminders/scheduler';

type ProgressSubtask = {
    id: string;
    title: string;
    description?: string;
    marks?: number;
    completed?: boolean;
};

function applyTaskMarks(
    progressSubtasks: ProgressSubtask[] = [],
    sourceSubtasks: ProgressSubtask[] = []
): ProgressSubtask[] {
    const sourceMap = new Map(sourceSubtasks.map((subtask) => [subtask.id, subtask]));
    const sourceByTitle = new Map(
        sourceSubtasks.map((subtask) => [String(subtask.title || '').trim().toLowerCase(), subtask])
    );
    return progressSubtasks.map((subtask) => ({
        ...subtask,
        marks: Number(
            sourceMap.get(subtask.id)?.marks ||
            sourceByTitle.get(String(subtask.title || '').trim().toLowerCase())?.marks ||
            0
        ),
    }));
}

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

        const visibleTask = await Task.findOne({
            _id: taskId,
            isPublished: { $ne: false },
        }).lean();

        if (!visibleTask) {
            return notFoundResponse('Task not found');
        }

        let progress = await StudentTaskProgress.findOne({
            studentId: payload.userId,
            taskId,
        });

        if (!progress) {
            progress = new StudentTaskProgress({
                studentId: payload.userId,
                taskId,
                status: 'todo',
                subtasks: visibleTask.subtasks.map((st: any) => ({
                    id: st.id,
                    title: st.title,
                    description: st.description,
                    marks: st.marks || 0,
                    completed: false,
                })),
            });

            await progress.save();
        }

        progress.subtasks = applyTaskMarks(
            (progress.subtasks || []) as ProgressSubtask[],
            (visibleTask.subtasks || []) as ProgressSubtask[]
        ) as any;

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

        const visibleTask = await Task.findOne({
            _id: taskId,
            isPublished: { $ne: false },
        }).lean();

        if (!visibleTask) {
            return notFoundResponse('Task not found');
        }

        let progress = await StudentTaskProgress.findOne({
            studentId: payload.userId,
            taskId,
        });

        if (!progress) {
            progress = new StudentTaskProgress({
                studentId: payload.userId,
                taskId,
                status: status || 'todo',
                subtasks: visibleTask.subtasks.map((st: any) => ({
                    id: st.id,
                    title: st.title,
                    description: st.description,
                    marks: st.marks || 0,
                    completed: false,
                })),
            });
        } else {
            if (status) {
                progress.status = status;
            }
            if (subtasks) {
                progress.subtasks = applyTaskMarks(
                    subtasks as ProgressSubtask[],
                    (visibleTask.subtasks || []) as ProgressSubtask[]
                ) as any;

                const allSubtasksCompleted = subtasks.every((st: any) => st.completed);
                if (allSubtasksCompleted && subtasks.length > 0) {
                    progress.status = 'done';
                }
            }
        }

        progress.subtasks = applyTaskMarks(
            (progress.subtasks || []) as ProgressSubtask[],
            (visibleTask.subtasks || []) as ProgressSubtask[]
        ) as any;

        await progress.save();

        if (progress.status === 'done') {
            await cancelReminderJobsForStudentItem({
                studentId: payload.userId,
                taskId,
            });
        } else if (progress.status === 'inprogress') {
            if (visibleTask.deadlineDate) {
                await scheduleReminderJobsForStudentItem({
                    studentId: payload.userId,
                    itemType: 'task',
                    itemId: taskId,
                    itemName: visibleTask.taskName,
                    deadlineDate: visibleTask.deadlineDate,
                    deadlineTime: visibleTask.deadlineTime || '23:59',
                });
            }
        } else {
            await cancelReminderJobsForStudentItem({
                studentId: payload.userId,
                taskId,
            });
        }

        return successResponse('Task progress updated', { progress }, 200);
    } catch (error: any) {
        console.error('Update task progress error:', error);
        return serverErrorResponse('An error occurred while updating task progress');
    }
}
