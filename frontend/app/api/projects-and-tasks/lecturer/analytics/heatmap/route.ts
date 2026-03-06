import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import Course from '@/model/Course';
import { Project, StudentProjectProgress, StudentTaskProgress, Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { getEligibleStudentsForCourse } from '@/lib/course-students';

type StudentLite = {
  _id: { toString(): string };
  name?: string;
  studentIdNumber?: string;
};

type ProgressLite = {
  updatedAt?: Date | string;
  projectId?: string;
  taskId?: string;
  status?: string;
  studentId: string;
};

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Unauthorized access - Only lecturers can access this endpoint');
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const studentIdFilter = searchParams.get('studentId');

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return errorResponse('Valid course ID is required', { courseId: ['Course ID is required'] }, 400);
    }

    const hasAccess = await Course.exists({
      _id: courseId,
      $or: [{ lecturerInCharge: payload.userId }, { lecturers: payload.userId }],
    });
    if (!hasAccess) {
      return unauthorizedResponse('You do not have access to this course');
    }

    const eligible = await getEligibleStudentsForCourse(courseId);
    if (!eligible) {
      return errorResponse('Course not found', { course: ['Course not found'] }, 404);
    }

    const eligibleStudents = eligible.students as StudentLite[];
    const eligibleStudentIdSet = new Set(eligibleStudents.map((student) => student._id.toString()));

    let targetStudentIds = [...eligibleStudentIdSet];
    if (studentIdFilter) {
      if (!eligibleStudentIdSet.has(studentIdFilter)) {
        return errorResponse(
          'Selected student does not belong to this module',
          { studentId: ['Invalid student for selected module'] },
          400
        );
      }
      targetStudentIds = [studentIdFilter];
    }

    if (targetStudentIds.length === 0) {
      return successResponse(
        'Lecturer heatmap retrieved successfully',
        {
          heatmap: [],
          totalDays: 0,
          totalActivities: 0,
          students: [],
          selectedStudentId: studentIdFilter || null,
        },
        200
      );
    }

    const [projects, tasks, projectProgressRows, taskProgressRows] = await Promise.all([
      Project.find({ courseId }).select('_id projectName').lean(),
      Task.find({ courseId }).select('_id taskName').lean(),
      StudentProjectProgress.find({ studentId: { $in: targetStudentIds } })
        .select('studentId projectId status updatedAt')
        .lean(),
      StudentTaskProgress.find({ studentId: { $in: targetStudentIds } })
        .select('studentId taskId status updatedAt')
        .lean(),
    ]);

    const studentMap = new Map(
      eligibleStudents.map((student) => [
        student._id.toString(),
        {
          _id: student._id.toString(),
          name: student.name || '',
          studentIdNumber: student.studentIdNumber || '',
        },
      ])
    );
    const projectMap = new Map(
      projects.map((project: { _id: { toString(): string }; projectName?: string }) => [
        project._id.toString(),
        project.projectName || 'Project',
      ])
    );
    const taskMap = new Map(
      tasks.map((task: { _id: { toString(): string }; taskName?: string }) => [
        task._id.toString(),
        task.taskName || 'Task',
      ])
    );

    const now = new Date();
    const rangeEnd = new Date(now);
    rangeEnd.setHours(23, 59, 59, 999);
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - 181);
    rangeStart.setHours(0, 0, 0, 0);

    const activityMap = new Map<
      string,
      {
        count: number;
        items: Array<{
          type: 'project' | 'task';
          id: string;
          name: string;
          status: string;
          studentId: string;
          studentName: string;
        }>;
      }
    >();

    const cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
      const key = cursor.toISOString().split('T')[0];
      activityMap.set(key, { count: 0, items: [] });
      cursor.setDate(cursor.getDate() + 1);
    }

    const registerProgress = (entry: ProgressLite, type: 'project' | 'task') => {
      const updatedAtRaw = entry.updatedAt;
      if (!updatedAtRaw) return;
      const updatedAt = updatedAtRaw instanceof Date ? updatedAtRaw : new Date(updatedAtRaw);
      if (Number.isNaN(updatedAt.getTime())) return;

      if (updatedAt < rangeStart || updatedAt > rangeEnd) return;
      const key = updatedAt.toISOString().split('T')[0];
      const day = activityMap.get(key);
      if (!day) return;

      const itemId = type === 'project' ? entry.projectId || '' : entry.taskId || '';
      const itemName = type === 'project' ? projectMap.get(itemId) : taskMap.get(itemId);
      const studentMeta = studentMap.get(entry.studentId);

      day.count += 1;
      day.items.push({
        type,
        id: itemId,
        name: itemName || (type === 'project' ? 'Project' : 'Task'),
        status: entry.status || 'todo',
        studentId: entry.studentId,
        studentName: studentMeta?.name || 'Student',
      });
    };

    (projectProgressRows as ProgressLite[]).forEach((row) => registerProgress(row, 'project'));
    (taskProgressRows as ProgressLite[]).forEach((row) => registerProgress(row, 'task'));

    const heatmap = Array.from(activityMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      level: Math.min(data.count, 4),
      items: data.items,
    }));

    const totalActivities = heatmap.reduce((sum, day) => sum + day.count, 0);

    return successResponse(
      'Lecturer heatmap retrieved successfully',
      {
        heatmap,
        totalDays: heatmap.length,
        totalActivities,
        students: eligibleStudents.map((student) => ({
          _id: student._id.toString(),
          name: student.name || '',
          studentIdNumber: student.studentIdNumber || '',
        })),
        selectedStudentId: studentIdFilter || null,
      },
      200
    );
  } catch (error: unknown) {
    console.error('Get lecturer heatmap error:', error);
    return serverErrorResponse('An error occurred while fetching lecturer heatmap');
  }
}
