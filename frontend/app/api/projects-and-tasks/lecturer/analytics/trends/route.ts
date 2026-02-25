import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import Course from '@/model/Course';
import CourseGroup from '@/model/CourseGroup';
import { Project, StudentProjectProgress, StudentTaskProgress, Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { getEligibleStudentsForCourse } from '@/lib/course-students';

type ItemTypeFilter = 'all' | 'project' | 'task';
type GranularityFilter = 'daily' | 'weekly' | 'monthly';

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
};

type TaskLite = {
  _id: { toString(): string };
  taskName?: string;
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
  updatedAt?: Date | string;
};

type AssignedItem = {
  itemType: 'project' | 'task';
  itemId: string;
};

type TimeBucket = {
  key: string;
  start: Date;
  end: Date;
};

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const offset = day === 0 ? -6 : 1 - day; // make Monday start
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildBuckets(windowDays: number, granularity: GranularityFilter): TimeBucket[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setDate(start.getDate() - (windowDays - 1));
  start.setHours(0, 0, 0, 0);

  if (granularity === 'daily') {
    const buckets: TimeBucket[] = [];
    const cursor = new Date(start);
    while (cursor <= now) {
      const dayStart = new Date(cursor);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      buckets.push({
        key: formatDate(dayStart),
        start: dayStart,
        end: dayEnd,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return buckets;
  }

  if (granularity === 'monthly') {
    const buckets: TimeBucket[] = [];
    const monthCursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    while (monthCursor <= endMonth) {
      const bucketStart = new Date(monthCursor);
      const bucketEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0, 23, 59, 59, 999);
      buckets.push({
        key: bucketStart.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        start: bucketStart,
        end: bucketEnd,
      });
      monthCursor.setMonth(monthCursor.getMonth() + 1);
    }
    return buckets.filter((b) => b.end >= start && b.start <= now);
  }

  const buckets: TimeBucket[] = [];
  let cursor = weekStart(start);
  const endCap = new Date(now);
  while (cursor <= endCap) {
    const bucketStart = new Date(cursor);
    const bucketEnd = new Date(cursor);
    bucketEnd.setDate(bucketEnd.getDate() + 6);
    bucketEnd.setHours(23, 59, 59, 999);
    buckets.push({
      key: `${formatDate(bucketStart)} to ${formatDate(bucketEnd)}`,
      start: bucketStart,
      end: bucketEnd,
    });
    cursor = new Date(bucketEnd);
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }
  return buckets.filter((b) => b.end >= start && b.start <= now);
}

function inRange(date: Date, from: Date, to: Date): boolean {
  return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Unauthorized access - Only lecturers can access this endpoint');
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const studentIdFilter = searchParams.get('studentId');
    const itemType = (searchParams.get('itemType') || 'all') as ItemTypeFilter;
    const granularity = (searchParams.get('granularity') || 'daily') as GranularityFilter;
    const windowDays = Number.parseInt(searchParams.get('window') || '30', 10);

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return errorResponse('Valid course ID is required', { courseId: ['Course ID is required'] }, 400);
    }
    if (!['all', 'project', 'task'].includes(itemType)) {
      return errorResponse('Invalid itemType', { itemType: ['Valid values: all, project, task'] }, 400);
    }
    if (!['daily', 'weekly', 'monthly'].includes(granularity)) {
      return errorResponse('Invalid granularity', { granularity: ['Valid values: daily, weekly, monthly'] }, 400);
    }
    if (!Number.isFinite(windowDays) || windowDays < 7 || windowDays > 365) {
      return errorResponse('Invalid window', { window: ['Window must be between 7 and 365 days'] }, 400);
    }

    const hasAccess = await Course.exists({
      _id: courseId,
      $or: [{ lecturerInCharge: payload.userId }, { lecturers: payload.userId }],
    });
    if (!hasAccess) return unauthorizedResponse('You do not have access to this course');

    const eligible = await getEligibleStudentsForCourse(courseId);
    if (!eligible) return errorResponse('Course not found', { course: ['Course not found'] }, 404);

    const eligibleStudents = eligible.students as StudentLite[];
    const eligibleStudentIdSet = new Set(eligibleStudents.map((s) => s._id.toString()));
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
      Project.find({ courseId }).select('_id projectType assignedGroupIds').lean(),
      Task.find({ courseId }).select('_id').lean(),
      CourseGroup.find({ courseId, isArchived: false }).select('_id studentIds').lean(),
      StudentProjectProgress.find({ studentId: { $in: targetStudentIds } })
        .select('studentId projectId status updatedAt')
        .lean(),
      StudentTaskProgress.find({ studentId: { $in: targetStudentIds } })
        .select('studentId taskId status updatedAt')
        .lean(),
    ]);

    const projects = projectsRaw as ProjectLite[];
    const tasks = tasksRaw as TaskLite[];
    const groups = groupsRaw as GroupLite[];
    const projectProgress = projectProgressRaw as ProgressLite[];
    const taskProgress = taskProgressRaw as ProgressLite[];

    const groupToStudents = new Map(
      groups.map((g) => [g._id.toString(), (g.studentIds || []).filter((sid) => eligibleStudentIdSet.has(sid))])
    );

    const assignments = new Map<string, AssignedItem[]>();
    targetStudentIds.forEach((sid) => assignments.set(sid, []));

    if (itemType === 'all' || itemType === 'project') {
      projects.forEach((project) => {
        const projectId = project._id.toString();
        let assignedStudentIds = targetStudentIds;

        if (
          project.projectType === 'group' &&
          Array.isArray(project.assignedGroupIds) &&
          project.assignedGroupIds.length > 0
        ) {
          const inGroups = new Set<string>();
          project.assignedGroupIds.forEach((groupId) => {
            (groupToStudents.get(groupId) || []).forEach((sid) => inGroups.add(sid));
          });
          assignedStudentIds = targetStudentIds.filter((sid) => inGroups.has(sid));
        }

        assignedStudentIds.forEach((sid) => {
          assignments.get(sid)?.push({ itemType: 'project', itemId: projectId });
        });
      });
    }

    if (itemType === 'all' || itemType === 'task') {
      tasks.forEach((task) => {
        const taskId = task._id.toString();
        targetStudentIds.forEach((sid) => {
          assignments.get(sid)?.push({ itemType: 'task', itemId: taskId });
        });
      });
    }

    const totalAssigned = Array.from(assignments.values()).reduce((sum, items) => sum + items.length, 0);

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - (windowDays - 1));
    currentStart.setHours(0, 0, 0, 0);

    const previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(-1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - (windowDays - 1));
    previousStart.setHours(0, 0, 0, 0);

    const progressRows = [
      ...projectProgress.map((row) => ({ ...row, itemType: 'project' as const })),
      ...taskProgress.map((row) => ({ ...row, itemType: 'task' as const })),
    ].filter((row) => row.updatedAt);

    const filteredRows = progressRows.filter((row) => itemType === 'all' || row.itemType === itemType);

    const rowsWithDate = filteredRows
      .map((row) => {
        const parsed = row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt as string);
        return Number.isNaN(parsed.getTime()) ? null : { ...row, updatedAtDate: parsed };
      })
      .filter(Boolean) as Array<ProgressLite & { itemType: 'project' | 'task'; updatedAtDate: Date }>;

    const buckets = buildBuckets(windowDays, granularity);
    const doneSeries: number[] = [];
    const inprogressSeries: number[] = [];
    const todoSeries: number[] = [];

    buckets.forEach((bucket) => {
      const inBucket = rowsWithDate.filter((row) => inRange(row.updatedAtDate, bucket.start, bucket.end));
      doneSeries.push(inBucket.filter((row) => row.status === 'done').length);
      inprogressSeries.push(inBucket.filter((row) => row.status === 'inprogress').length);
      todoSeries.push(inBucket.filter((row) => !row.status || row.status === 'todo').length);
    });

    const currentRows = rowsWithDate.filter((row) => inRange(row.updatedAtDate, currentStart, now));
    const previousRows = rowsWithDate.filter((row) => inRange(row.updatedAtDate, previousStart, previousEnd));

    const currentDone = currentRows.filter((row) => row.status === 'done').length;
    const previousDone = previousRows.filter((row) => row.status === 'done').length;
    const currentInProgress = currentRows.filter((row) => row.status === 'inprogress').length;
    const previousInProgress = previousRows.filter((row) => row.status === 'inprogress').length;

    const currentActiveStudents = new Set(currentRows.map((row) => row.studentId)).size;
    const previousActiveStudents = new Set(previousRows.map((row) => row.studentId)).size;

    const completionRateCurrent = pct(currentDone, totalAssigned);
    const completionRatePrevious = pct(previousDone, totalAssigned);

    const studentMomentum = targetStudentIds
      .map((studentId) => {
        const student = eligibleStudents.find((s) => s._id.toString() === studentId);
        const currentCount = currentRows.filter((row) => row.studentId === studentId && row.status === 'done').length;
        const previousCount = previousRows.filter((row) => row.studentId === studentId && row.status === 'done').length;
        const deltaAbs = currentCount - previousCount;
        const deltaPct =
          previousCount === 0 ? (currentCount > 0 ? 100 : 0) : Number((((currentCount - previousCount) / previousCount) * 100).toFixed(1));

        const momentum = deltaAbs > 0 ? 'Improving' : deltaAbs < 0 ? 'Declining' : 'Flat';
        return {
          studentId,
          studentName: student?.name || '',
          studentIdNumber: student?.studentIdNumber || '',
          currentCompletions: currentCount,
          previousCompletions: previousCount,
          deltaAbs,
          deltaPct,
          momentum,
        };
      })
      .sort((a, b) => b.deltaAbs - a.deltaAbs);

    return successResponse(
      'Lecturer trends analytics retrieved successfully',
      {
        kpis: {
          completionRate: completionRateCurrent,
          completionRateDelta: Number((completionRateCurrent - completionRatePrevious).toFixed(1)),
          inProgressRatio: pct(currentInProgress, totalAssigned),
          inProgressRatioDelta: Number((pct(currentInProgress, totalAssigned) - pct(previousInProgress, totalAssigned)).toFixed(1)),
          activeStudents: currentActiveStudents,
          activeStudentsDelta: currentActiveStudents - previousActiveStudents,
          doneCurrent: currentDone,
          donePrevious: previousDone,
        },
        series: {
          labels: buckets.map((b) => b.key),
          done: doneSeries,
          inprogress: inprogressSeries,
          todo: todoSeries,
          completionRate: doneSeries.map((value) => pct(value, totalAssigned)),
        },
        studentMomentum,
        studentsOptions: eligibleStudents.map((student) => ({
          _id: student._id.toString(),
          name: student.name || '',
          studentIdNumber: student.studentIdNumber || '',
        })),
        filters: {
          selectedStudentId: studentIdFilter || null,
          itemType,
          granularity,
          windowDays,
        },
      },
      200
    );
  } catch (error: unknown) {
    console.error('Get lecturer trends analytics error:', error);
    return serverErrorResponse('An error occurred while fetching lecturer trends analytics');
  }
}
