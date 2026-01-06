import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { StudentProjectProgress, Project } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
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

        // Get all project progresses for this student
        const progresses = await StudentProjectProgress.find({
            studentId: payload.userId,
        }).sort({ updatedAt: -1 });

        // Get all related projects with course info
        const projectIds = progresses.map(p => p.projectId);
        const projects = await Project.find({ _id: { $in: projectIds } });

        // Combine progress with project details
        const enrichedProgresses = await Promise.all(
            progresses.map(async (progress) => {
                const project = projects.find(p => p._id.toString() === progress.projectId);
                if (!project) return null;

                const course = await Course.findById(project.courseId);

                return {
                    projectId: progress.projectId,
                    projectName: project.projectName,
                    courseId: project.courseId,
                    courseName: course?.courseName || 'Unknown Course',
                    status: progress.status,
                    mainTasks: progress.mainTasks,
                    deadlineDate: project.deadlineDate,
                    deadlineTime: project.deadlineTime,
                    projectType: project.projectType,
                    updatedAt: progress.updatedAt,
                };
            })
        );

        const validProgresses = enrichedProgresses.filter(p => p !== null);

        return successResponse('Projects retrieved successfully', {
            projects: validProgresses,
            total: validProgresses.length,
        }, 200);
    } catch (error: any) {
        console.error('Get projects error:', error);
        return serverErrorResponse('An error occurred while fetching projects');
    }
}