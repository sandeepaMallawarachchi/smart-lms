import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { StudentProjectProgress, Project } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { successResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';
import {
    cancelReminderJobsForStudentItem,
    scheduleReminderJobsForStudentItem,
} from '@/lib/projects-and-tasks/reminders/scheduler';

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
                    completed: false,
                    subtasks: task.subtasks?.map((st: any) => ({
                        id: st.id,
                        title: st.title,
                        description: st.description,
                        completed: false,
                    })),
                })),
            });

            await progress.save();

        }

        if (progress.status !== 'done' && visibleProject.deadlineDate) {
            await scheduleReminderJobsForStudentItem({
                studentId: payload.userId,
                itemType: 'project',
                itemId: projectId,
                itemName: visibleProject.projectName,
                deadlineDate: visibleProject.deadlineDate,
                deadlineTime: visibleProject.deadlineTime || '23:59',
            });
        }

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
                    completed: false,
                    subtasks: task.subtasks?.map((st: any) => ({
                        id: st.id,
                        title: st.title,
                        description: st.description,
                        completed: false,
                    })),
                })),
            });
        } else {
            if (status) {
                progress.status = status;
            }
            if (mainTasks) {
                progress.mainTasks = mainTasks;

                const allTasksCompleted = mainTasks.every((task: any) => task.completed);
                if (allTasksCompleted && mainTasks.length > 0) {
                    progress.status = 'done';
                }
            }
        }

        await progress.save();

        if (progress.status === 'done') {
            await cancelReminderJobsForStudentItem({
                studentId: payload.userId,
                projectId,
            });
        } else {
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
        }

        return successResponse('Project progress updated', { progress }, 200);
    } catch (error: any) {
        console.error('Update project progress error:', error);
        return serverErrorResponse('An error occurred while updating project progress');
    }
}
