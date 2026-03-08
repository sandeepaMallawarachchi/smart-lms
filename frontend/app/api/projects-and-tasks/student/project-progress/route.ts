import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { StudentProjectProgress, Project } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
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

type ProgressMainTask = {
    id: string;
    title: string;
    description?: string;
    marks?: number;
    completed?: boolean;
    subtasks?: ProgressSubtask[];
};

function applyProjectMarks(
    progressMainTasks: ProgressMainTask[] = [],
    sourceMainTasks: ProgressMainTask[] = []
): ProgressMainTask[] {
    const sourceMainMap = new Map(sourceMainTasks.map((task) => [task.id, task]));
    const sourceMainByTitle = new Map(
        sourceMainTasks.map((task) => [String(task.title || '').trim().toLowerCase(), task])
    );

    return progressMainTasks.map((task) => {
        const sourceTask =
            sourceMainMap.get(task.id) ||
            sourceMainByTitle.get(String(task.title || '').trim().toLowerCase());
        const sourceSubtaskMap = new Map((sourceTask?.subtasks || []).map((subtask) => [subtask.id, subtask]));
        const sourceSubtaskByTitle = new Map(
            (sourceTask?.subtasks || []).map((subtask) => [
                String(subtask.title || '').trim().toLowerCase(),
                subtask,
            ])
        );

        return {
            ...task,
            marks: Number(sourceTask?.marks || 0),
            subtasks: (task.subtasks || []).map((subtask) => ({
                ...subtask,
                marks: Number(
                    sourceSubtaskMap.get(subtask.id)?.marks ||
                    sourceSubtaskByTitle.get(String(subtask.title || '').trim().toLowerCase())?.marks ||
                    0
                ),
            })),
        };
    });
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

        const projectId = request.nextUrl.searchParams.get('projectId');

        if (!projectId) {
            return notFoundResponse('Project ID is required');
        }

        const visibleProject = await Project.findOne({
            _id: projectId,
            isPublished: { $ne: false },
        }).lean();

        if (!visibleProject) {
            return notFoundResponse('Project not found');
        }

        let progress = await StudentProjectProgress.findOne({
            studentId: payload.userId,
            projectId,
        });

        if (!progress) {
            progress = new StudentProjectProgress({
                studentId: payload.userId,
                projectId,
                status: 'todo',
                mainTasks: visibleProject.mainTasks.map((task: any) => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    marks: task.marks || 0,
                    completed: false,
                    subtasks: task.subtasks?.map((st: any) => ({
                        id: st.id,
                        title: st.title,
                        description: st.description,
                        marks: st.marks || 0,
                        completed: false,
                    })),
                })),
            });

            await progress.save();
        }

        progress.mainTasks = applyProjectMarks(
            (progress.mainTasks || []) as ProgressMainTask[],
            (visibleProject.mainTasks || []) as ProgressMainTask[]
        ) as any;

        return successResponse('Project progress retrieved', { progress }, 200);
    } catch (error: any) {
        console.error('Get project progress error:', error);
        return serverErrorResponse('An error occurred while fetching project progress');
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
        const { projectId, status, mainTasks } = body;

        if (!projectId) {
            return notFoundResponse('Project ID is required');
        }

        const visibleProject = await Project.findOne({
            _id: projectId,
            isPublished: { $ne: false },
        }).lean();

        if (!visibleProject) {
            return notFoundResponse('Project not found');
        }

        let progress = await StudentProjectProgress.findOne({
            studentId: payload.userId,
            projectId,
        });

        if (!progress) {
            progress = new StudentProjectProgress({
                studentId: payload.userId,
                projectId,
                status: status || 'todo',
                mainTasks: mainTasks || visibleProject.mainTasks.map((task: any) => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    marks: task.marks || 0,
                    completed: false,
                    subtasks: task.subtasks?.map((st: any) => ({
                        id: st.id,
                        title: st.title,
                        description: st.description,
                        marks: st.marks || 0,
                        completed: false,
                    })),
                })),
            });
        } else {
            if (status) {
                progress.status = status;
            }
            if (mainTasks) {
                progress.mainTasks = applyProjectMarks(
                    mainTasks as ProgressMainTask[],
                    (visibleProject.mainTasks || []) as ProgressMainTask[]
                ) as any;

                const allTasksCompleted = mainTasks.every((task: any) => task.completed);
                if (allTasksCompleted && mainTasks.length > 0) {
                    progress.status = 'done';
                }
            }
        }

        progress.mainTasks = applyProjectMarks(
            (progress.mainTasks || []) as ProgressMainTask[],
            (visibleProject.mainTasks || []) as ProgressMainTask[]
        ) as any;

        await progress.save();

        if (progress.status === 'done') {
            await cancelReminderJobsForStudentItem({
                studentId: payload.userId,
                projectId,
            });
        } else if (progress.status === 'inprogress') {
            if (visibleProject.deadlineDate) {
                await scheduleReminderJobsForStudentItem({
                    studentId: payload.userId,
                    itemType: 'project',
                    itemId: projectId,
                    itemName: visibleProject.projectName,
                    deadlineDate: visibleProject.deadlineDate,
                    deadlineTime: visibleProject.deadlineTime || '23:59',
                });
            }
        } else {
            await cancelReminderJobsForStudentItem({
                studentId: payload.userId,
                projectId,
            });
        }

        return successResponse('Project progress updated', { progress }, 200);
    } catch (error: any) {
        console.error('Update project progress error:', error);
        return serverErrorResponse('An error occurred while updating project progress');
    }
}
