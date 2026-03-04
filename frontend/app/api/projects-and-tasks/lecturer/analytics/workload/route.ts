import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import Course from '@/model/Course';
import CourseGroup from '@/model/CourseGroup';
import { Project, StudentProjectProgress, StudentTaskProgress, Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { getEligibleStudentsForCourse } from '@/lib/course-students';

type StudentLite = {
  _id: { toString(): string };
  name?: string;
  studentIdNumber?: string;
};

type ProjectLite = {
  _id: { toString(): string };
  projectName?: string;
  projectType?: 'group' | 'individual';
  assignedGroupIds?: string[];
  deadlineDate?: string;
  deadlineTime?: string;
};

type TaskLite = {
  _id: { toString(): string };
  taskName?: string;
  deadlineDate?: string;
  deadlineTime?: string;
};

type GroupLite = {
  _id: { toString(): string };
  studentIds?: string[];
};

type ProgressLite = {
  studentId: string;
  projectId?: string;
  taskId?: string;
  status?: 'todo' | 'inprogress' | 'done' | string;
};

type AssignedItem = {
  itemType: 'project' | 'task';
  itemId: string;
  itemName: string;
  dueAt: Date | null;
};

type ItemTypeFilter = 'all' | 'project' | 'task';

function parseDeadline(deadlineDate?: string, deadlineTime?: string): Date | null {
  if (!deadlineDate) return null;
  const parsed = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function bucketPending(value: number): string {
  if (value <= 2) return '0-2';
  if (value <= 5) return '3-5';
  if (value <= 8) return '6-8';
  return '9+';
}

function scoreWorkload(input: {
  pending: number;
  overdue: number;
  inProgress: number;
  completed: number;
}): number {
  const raw = input.pending * 10 + input.overdue * 20 + input.inProgress * 5 - input.completed * 3;
  return Math.max(0, Math.min(100, raw));
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
    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Unauthorized access - Only lecturers can access this endpoint');
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const studentIdFilter = searchParams.get('studentId');
    const itemType = (searchParams.get('itemType') || 'all') as ItemTypeFilter;
    const windowDays = Number.parseInt(searchParams.get('window') || '14', 10);

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return errorResponse('Valid course ID is required', { courseId: ['Course ID is required'] }, 400);
    }
    if (!['all', 'project', 'task'].includes(itemType)) {
      return errorResponse('Invalid itemType', { itemType: ['Valid values: all, project, task'] }, 400);
    }
    if (!Number.isFinite(windowDays) || windowDays < 1 || windowDays > 60) {
      return errorResponse('Invalid window', { window: ['Window must be between 1 and 60 days'] }, 400);
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

    const [projectsRaw, tasksRaw, groupsRaw, projectProgressRaw, taskProgressRaw] = await Promise.all([
      Project.find({ courseId })
        .select('_id projectName projectType assignedGroupIds deadlineDate deadlineTime')
        .lean(),
      Task.find({ courseId })
        .select('_id taskName deadlineDate deadlineTime')
        .lean(),
      CourseGroup.find({ courseId, isArchived: false }).select('_id studentIds').lean(),
      StudentProjectProgress.find({ studentId: { $in: targetStudentIds } })
        .select('studentId projectId status')
        .lean(),
      StudentTaskProgress.find({ studentId: { $in: targetStudentIds } })
        .select('studentId taskId status')
        .lean(),
    ]);

    const projects = projectsRaw as ProjectLite[];
    const tasks = tasksRaw as TaskLite[];
    const groups = groupsRaw as GroupLite[];
    const projectProgress = projectProgressRaw as ProgressLite[];
    const taskProgress = taskProgressRaw as ProgressLite[];

    const groupToStudents = new Map(
      groups.map((group) => [
        group._id.toString(),
        (group.studentIds || []).filter((studentId) => eligibleStudentIdSet.has(studentId)),
      ])
    );

    const assignments = new Map<string, AssignedItem[]>();
    targetStudentIds.forEach((studentId) => assignments.set(studentId, []));

    if (itemType === 'all' || itemType === 'project') {
      projects.forEach((project) => {
        const projectId = project._id.toString();
        const dueAt = parseDeadline(project.deadlineDate, project.deadlineTime);
        const baseItem: AssignedItem = {
          itemType: 'project',
          itemId: projectId,
          itemName: project.projectName || 'Project',
          dueAt,
        };

        let assignedStudentIds: string[] = targetStudentIds;
        if (
          project.projectType === 'group' &&
          Array.isArray(project.assignedGroupIds) &&
          project.assignedGroupIds.length > 0
        ) {
          const inGroups = new Set<string>();
          project.assignedGroupIds.forEach((groupId) => {
            (groupToStudents.get(groupId) || []).forEach((studentId) => inGroups.add(studentId));
          });
          assignedStudentIds = targetStudentIds.filter((studentId) => inGroups.has(studentId));
        }

        assignedStudentIds.forEach((studentId) => {
          assignments.get(studentId)?.push(baseItem);
        });
      });
    }

    if (itemType === 'all' || itemType === 'task') {
      tasks.forEach((task) => {
        const taskId = task._id.toString();
        const dueAt = parseDeadline(task.deadlineDate, task.deadlineTime);
        const baseItem: AssignedItem = {
          itemType: 'task',
          itemId: taskId,
          itemName: task.taskName || 'Task',
          dueAt,
        };
        targetStudentIds.forEach((studentId) => {
          assignments.get(studentId)?.push(baseItem);
        });
      });
    }

    const projectProgressMap = new Map(
      projectProgress.map((row) => [`${row.studentId}:${row.projectId}`, row.status || 'todo'])
    );
    const taskProgressMap = new Map(
      taskProgress.map((row) => [`${row.studentId}:${row.taskId}`, row.status || 'todo'])
    );

    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + windowDays);

    const students = eligibleStudents
      .filter((student) => targetStudentIds.includes(student._id.toString()))
      .map((student) => {
        const studentId = student._id.toString();
        const studentAssignments = assignments.get(studentId) || [];

        let completed = 0;
        let inProgress = 0;
        let pending = 0;
        let overdue = 0;

        studentAssignments.forEach((item) => {
          const status =
            item.itemType === 'project'
              ? projectProgressMap.get(`${studentId}:${item.itemId}`) || 'todo'
              : taskProgressMap.get(`${studentId}:${item.itemId}`) || 'todo';

          if (status === 'done') {
            completed += 1;
          } else if (status === 'inprogress') {
            inProgress += 1;
          } else {
            pending += 1;
          }

          if (status !== 'done' && item.dueAt && item.dueAt.getTime() < now.getTime()) {
            overdue += 1;
          }
        });

        const workloadScore = scoreWorkload({ pending, overdue, inProgress, completed });
        const risk =
          workloadScore >= 70
            ? 'High'
            : workloadScore < 30 && studentAssignments.length > 0
            ? 'Low Activity'
            : 'Balanced';

        return {
          studentId,
          studentName: student.name || '',
          studentIdNumber: student.studentIdNumber || '',
          assigned: studentAssignments.length,
          completed,
          inProgress,
          pending,
          overdue,
          workloadScore,
          risk,
        };
      });

    const avgPending =
      students.length > 0
        ? Number((students.reduce((sum, student) => sum + student.pending, 0) / students.length).toFixed(1))
        : 0;
    const overloadedCount = students.filter((student) => student.workloadScore >= 70).length;
    const underloadedCount = students.filter((student) => student.risk === 'Low Activity').length;

    const distributionBuckets = new Map<string, number>([
      ['0-2', 0],
      ['3-5', 0],
      ['6-8', 0],
      ['9+', 0],
    ]);
    students.forEach((student) => {
      const bucket = bucketPending(student.pending);
      distributionBuckets.set(bucket, (distributionBuckets.get(bucket) || 0) + 1);
    });

    const uniqueItemsByType = new Map<string, { dueAt: Date | null }>();
    targetStudentIds.forEach((studentId) => {
      (assignments.get(studentId) || []).forEach((item) => {
        uniqueItemsByType.set(`${item.itemType}:${item.itemId}`, { dueAt: item.dueAt });
      });
    });

    const upcomingDeadlines = Array.from(uniqueItemsByType.values()).filter(
      (item) => item.dueAt && item.dueAt.getTime() >= now.getTime() && item.dueAt.getTime() <= windowEnd.getTime()
    ).length;

    return successResponse(
      'Lecturer workload analytics retrieved successfully',
      {
        kpis: {
          totalStudents: students.length,
          avgPending,
          overloadedCount,
          underloadedCount,
          upcomingDeadlines,
        },
        filters: {
          selectedStudentId: studentIdFilter || null,
          itemType,
          windowDays,
        },
        students,
        studentsOptions: eligibleStudents.map((student) => ({
          _id: student._id.toString(),
          name: student.name || '',
          studentIdNumber: student.studentIdNumber || '',
        })),
        distribution: Array.from(distributionBuckets.entries()).map(([bucket, count]) => ({
          bucket,
          count,
        })),
      },
      200
    );
  } catch (error: unknown) {
    console.error('Get lecturer workload analytics error:', error);
    return serverErrorResponse('An error occurred while fetching lecturer workload analytics');
  }
}
