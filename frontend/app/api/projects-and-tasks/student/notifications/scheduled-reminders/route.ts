import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Notification } from '@/model/projects-and-tasks/notificationModel';
import Student from '@/model/Student';
import Course from '@/model/Course';
import {
  Project,
  StudentProjectProgress,
  StudentTaskProgress,
  Task,
} from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';
import { scheduleReminderJobsForStudentItem } from '@/lib/projects-and-tasks/reminders/scheduler';

type ItemLite = {
  _id: { toString(): string };
  projectName?: string;
  taskName?: string;
  deadlineDate?: string;
  deadlineTime?: string;
  createdAt?: string | Date;
};
type ProjectProgressLite = { projectId: string; status?: 'todo' | 'inprogress' | 'done' };
type TaskProgressLite = { taskId: string; status?: 'todo' | 'inprogress' | 'done' };
type StudentLite = { academicYear?: string | number; semester?: string | number; specialization?: string };
type CourseLite = { _id: { toString(): string } };

function parseDeadline(deadlineDate?: string, deadlineTime?: string): Date | null {
  if (!deadlineDate) return null;
  const parsed = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function computeReminderScheduleTimesFromStart(start: Date, deadline: Date) {
  const totalMs = deadline.getTime() - start.getTime();
  if (totalMs <= 0) return [];

  const checkpoints = [25, 50, 75, 100] as const;
  return checkpoints.map((percentage) => {
    const offsetMs = Math.floor((totalMs * percentage) / 100);
    return {
      percentage,
      scheduledFor: new Date(start.getTime() + offsetMs),
    };
  });
}

function buildReminderContent(input: {
  itemType: 'project' | 'task';
  itemName: string;
  reminderPercentage: 25 | 50 | 75 | 100;
}) {
  const prefix = input.itemType === 'project' ? 'Project' : 'Task';

  if (input.reminderPercentage === 25) {
    return {
      title: `${prefix}: ${input.itemName} - Time to Start (25%)`,
      message: `${input.itemName} deadline is approaching.`,
      description: 'You still have 75% of the time left. Start now.',
      type: input.itemType === 'project' ? 'project_reminder' : 'task_reminder',
      reminderType: `${input.itemType}_25` as const,
    };
  }

  if (input.reminderPercentage === 50) {
    return {
      title: `${prefix}: ${input.itemName} - Halfway (50%)`,
      message: `${input.itemName} has reached the halfway point.`,
      description: "You're at the 50% time mark.",
      type: input.itemType === 'project' ? 'project_reminder' : 'task_reminder',
      reminderType: `${input.itemType}_50` as const,
    };
  }

  if (input.reminderPercentage === 75) {
    return {
      title: `${prefix}: ${input.itemName} - Deadline Near (75%)`,
      message: `${input.itemName} is nearing its deadline.`,
      description: 'Only 25% of time remains.',
      type: 'deadline_warning' as const,
      reminderType: `${input.itemType}_75` as const,
    };
  }

  return {
    title: `${prefix}: ${input.itemName} - Deadline Time`,
    message: `${input.itemName} deadline is now.`,
    description: 'Final reminder for this deadline.',
    type: 'deadline_warning' as const,
    reminderType: `${input.itemType}_deadline` as const,
  };
}

async function backfillElapsedReminderNotifications(studentId: string) {
  const student = (await Student.findById(studentId).lean()) as StudentLite | null;
  if (!student) return;

  const assignedCourses = await Course.find({
    year: parseInt(String(student.academicYear), 10),
    semester: parseInt(String(student.semester), 10),
    specializations: student.specialization,
    isArchived: false,
  })
    .select('_id')
    .lean();

  const courseIds = (assignedCourses as CourseLite[]).map((course) => course._id.toString());
  if (courseIds.length === 0) return;

  const [projects, tasks, projectProgress, taskProgress] = await Promise.all([
    Project.find({
      courseId: { $in: courseIds },
      isPublished: { $ne: false },
      isArchived: { $ne: true },
    })
      .select('_id projectName deadlineDate deadlineTime createdAt')
      .lean(),
    Task.find({
      courseId: { $in: courseIds },
      isPublished: { $ne: false },
      isArchived: { $ne: true },
    })
      .select('_id taskName deadlineDate deadlineTime createdAt')
      .lean(),
    StudentProjectProgress.find({ studentId }).select('projectId status').lean(),
    StudentTaskProgress.find({ studentId }).select('taskId status').lean(),
  ]);

  const now = Date.now();
  const projectProgressById = new Map(
    (projectProgress as ProjectProgressLite[]).map((row) => [String(row.projectId), row.status || 'todo'])
  );
  const taskProgressById = new Map(
    (taskProgress as TaskProgressLite[]).map((row) => [String(row.taskId), row.status || 'todo'])
  );

  const reminderDocs: Array<{
    studentId: string;
    projectId?: string;
    taskId?: string;
    itemType: 'project' | 'task';
    itemName: string;
    reminderType: 'project_25' | 'project_50' | 'project_75' | 'project_deadline' | 'task_25' | 'task_50' | 'task_75' | 'task_deadline';
    dedupeKey: string;
    type: 'project_reminder' | 'task_reminder' | 'deadline_warning';
    reminderPercentage: number;
    title: string;
    message: string;
    description: string;
    isRead: boolean;
    isSent: boolean;
    sentAt: Date;
    scheduledFor: Date;
  }> = [];

  const collectReminderDoc = (itemType: 'project' | 'task', item: ItemLite, status: string) => {
    if (status === 'done') return;

    const deadline = parseDeadline(item.deadlineDate, item.deadlineTime);
    if (!deadline) return;
    if (deadline.getTime() <= now) return;

    const itemId = item._id.toString();
    const itemName = String(itemType === 'project' ? item.projectName || 'Project' : item.taskName || 'Task');
    const parsedStart = item.createdAt ? new Date(item.createdAt) : null;
    const start =
      parsedStart && !Number.isNaN(parsedStart.getTime()) && parsedStart.getTime() < deadline.getTime()
        ? parsedStart
        : new Date();

    const checkpoints = computeReminderScheduleTimesFromStart(start, deadline).filter(
      (point) => point.scheduledFor.getTime() <= now
    );
    if (checkpoints.length === 0) return;

    const latestCheckpoint = checkpoints[checkpoints.length - 1];
    const content = buildReminderContent({
      itemType,
      itemName,
      reminderPercentage: latestCheckpoint.percentage,
    });
    const dedupeKey = `notif:${studentId}:${itemId}:${content.reminderType}`;

    reminderDocs.push({
      studentId,
      projectId: itemType === 'project' ? itemId : undefined,
      taskId: itemType === 'task' ? itemId : undefined,
      itemType,
      itemName,
      reminderType: content.reminderType,
      dedupeKey,
      type: content.type,
      reminderPercentage: latestCheckpoint.percentage,
      title: content.title,
      message: content.message,
      description: content.description,
      isRead: false,
      isSent: true,
      sentAt: new Date(),
      scheduledFor: latestCheckpoint.scheduledFor,
    });
  };

  (projects as ItemLite[]).forEach((project) => {
    collectReminderDoc('project', project, projectProgressById.get(project._id.toString()) || 'todo');
  });

  (tasks as ItemLite[]).forEach((task) => {
    collectReminderDoc('task', task, taskProgressById.get(task._id.toString()) || 'todo');
  });

  for (const doc of reminderDocs) {
    const existing = await Notification.findOne({ dedupeKey: doc.dedupeKey }).select('_id').lean();
    if (existing) continue;
    await Notification.create(doc);
  }
}

async function backfillOverdueNotifications(studentId: string) {
  const student = (await Student.findById(studentId).lean()) as StudentLite | null;
  if (!student) return;

  const assignedCourses = await Course.find({
    year: parseInt(String(student.academicYear), 10),
    semester: parseInt(String(student.semester), 10),
    specializations: student.specialization,
    isArchived: false,
  })
    .select('_id')
    .lean();

  const courseIds = (assignedCourses as CourseLite[]).map((course) => course._id.toString());
  if (courseIds.length === 0) return;

  const [projects, tasks, projectProgress, taskProgress] = await Promise.all([
    Project.find({
      courseId: { $in: courseIds },
      isPublished: { $ne: false },
      isArchived: { $ne: true },
    })
      .select('_id projectName deadlineDate deadlineTime')
      .lean(),
    Task.find({
      courseId: { $in: courseIds },
      isPublished: { $ne: false },
      isArchived: { $ne: true },
    })
      .select('_id taskName deadlineDate deadlineTime')
      .lean(),
    StudentProjectProgress.find({ studentId }).select('projectId status').lean(),
    StudentTaskProgress.find({ studentId }).select('taskId status').lean(),
  ]);

  const now = Date.now();
  const projectProgressById = new Map(
    (projectProgress as ProjectProgressLite[]).map((row) => [String(row.projectId), row.status || 'todo'])
  );
  const taskProgressById = new Map(
    (taskProgress as TaskProgressLite[]).map((row) => [String(row.taskId), row.status || 'todo'])
  );

  const overdueDocs: Array<{
    studentId: string;
    projectId?: string;
    taskId?: string;
    itemType: 'project' | 'task';
    itemName: string;
    reminderType: 'project_overdue' | 'task_overdue';
    dedupeKey: string;
    type: 'overdue';
    reminderPercentage: number;
    title: string;
    message: string;
    description: string;
    isRead: boolean;
    isSent: boolean;
    sentAt: Date;
    scheduledFor: Date;
  }> = [];

  (projects as ItemLite[]).forEach((project) => {
    const itemId = project._id.toString();
    const status = projectProgressById.get(itemId) || 'todo';
    if (status === 'done') return;

    const deadline = parseDeadline(project.deadlineDate, project.deadlineTime);
    if (!deadline || deadline.getTime() > now) return;

    const itemName = String(project.projectName || 'Project');
    overdueDocs.push({
      studentId,
      projectId: itemId,
      itemType: 'project',
      itemName,
      reminderType: 'project_overdue',
      dedupeKey: `notif:${studentId}:${itemId}:project_overdue`,
      type: 'overdue',
      reminderPercentage: 100,
      title: `Project: ${itemName} - Overdue`,
      message: `${itemName} is overdue.`,
      description: 'The deadline has passed. Submit as soon as possible.',
      isRead: false,
      isSent: true,
      sentAt: new Date(),
      scheduledFor: deadline,
    });
  });

  (tasks as ItemLite[]).forEach((task) => {
    const itemId = task._id.toString();
    const status = taskProgressById.get(itemId) || 'todo';
    if (status === 'done') return;

    const deadline = parseDeadline(task.deadlineDate, task.deadlineTime);
    if (!deadline || deadline.getTime() > now) return;

    const itemName = String(task.taskName || 'Task');
    overdueDocs.push({
      studentId,
      taskId: itemId,
      itemType: 'task',
      itemName,
      reminderType: 'task_overdue',
      dedupeKey: `notif:${studentId}:${itemId}:task_overdue`,
      type: 'overdue',
      reminderPercentage: 100,
      title: `Task: ${itemName} - Overdue`,
      message: `${itemName} is overdue.`,
      description: 'The deadline has passed. Submit as soon as possible.',
      isRead: false,
      isSent: true,
      sentAt: new Date(),
      scheduledFor: deadline,
    });
  });

  for (const doc of overdueDocs) {
    const existing = await Notification.findOne({ dedupeKey: doc.dedupeKey }).select('_id').lean();
    if (existing) continue;
    await Notification.create(doc);
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
    const { projectId, taskId } = body as { projectId?: string; taskId?: string };

    if (!projectId && !taskId) {
      return serverErrorResponse('Project ID or Task ID is required');
    }

    let itemType: 'project' | 'task' | null = null;
    let itemId: string | null = null;
    let item: Record<string, unknown> | null = null;

    if (projectId) {
      const project = await Project.findOne({ _id: projectId, isPublished: { $ne: false } }).lean();
      if (project) {
        itemType = 'project';
        itemId = projectId;
        item = project;
      }
    }

    if (!item && taskId) {
      const task = await Task.findOne({ _id: taskId, isPublished: { $ne: false } }).lean();
      if (task) {
        itemType = 'task';
        itemId = taskId;
        item = task;
      }
    }

    // Backward compatibility: some clients may send task id in projectId.
    if (!item && projectId) {
      const taskFallback = await Task.findOne({ _id: projectId, isPublished: { $ne: false } }).lean();
      if (taskFallback) {
        itemType = 'task';
        itemId = projectId;
        item = taskFallback;
      }
    }

    if (!item) {
      return serverErrorResponse('Project or task not found');
    }

    const resolvedItemType = itemType as 'project' | 'task';
    const resolvedItemId = itemId as string;
    const itemName = resolvedItemType === 'project'
      ? String(item.projectName || '')
      : String(item.taskName || '');
    const scheduledJobs = await scheduleReminderJobsForStudentItem({
      studentId: payload.userId,
      itemType: resolvedItemType,
      itemId: resolvedItemId,
      itemName,
      deadlineDate: item.deadlineDate,
      deadlineTime: item.deadlineTime || '23:59',
      startAt: item.createdAt as string | Date | undefined,
    });

    return successResponse(
      'Reminders scheduled',
      {
        itemType: resolvedItemType,
        itemId: resolvedItemId,
        itemName,
        reminders: scheduledJobs,
      },
      200
    );
  } catch (error: unknown) {
    console.error('Schedule reminders error:', error);
    return serverErrorResponse('An error occurred while scheduling reminders');
  }
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

    await backfillElapsedReminderNotifications(payload.userId);
    await backfillOverdueNotifications(payload.userId);

    const notifications = await Notification.find({
      studentId: payload.userId,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    type NotificationRow = {
      projectId?: string;
      taskId?: string;
    };
    type ObjectIdLite = { _id: { toString(): string } };

    const projectIds = Array.from(
      new Set(
        (notifications as NotificationRow[])
          .map((n) => n.projectId)
          .filter((id): id is string => Boolean(id))
      )
    );
    const taskIds = Array.from(
      new Set(
        (notifications as NotificationRow[])
          .map((n) => n.taskId)
          .filter((id): id is string => Boolean(id))
      )
    );

    const [visibleProjects, visibleTasks] = await Promise.all([
      projectIds.length
        ? Project.find({ _id: { $in: projectIds }, isPublished: { $ne: false } }).select('_id').lean()
        : Promise.resolve([]),
      taskIds.length
        ? Task.find({ _id: { $in: taskIds }, isPublished: { $ne: false } }).select('_id').lean()
        : Promise.resolve([]),
    ]);

    const visibleProjectSet = new Set((visibleProjects as ObjectIdLite[]).map((project) => project._id.toString()));
    const visibleTaskSet = new Set((visibleTasks as ObjectIdLite[]).map((task) => task._id.toString()));

    const filteredNotifications = (notifications as Array<{ projectId?: string; taskId?: string }>)
      .filter((notification) => {
        if (notification.projectId) return visibleProjectSet.has(notification.projectId);
        if (notification.taskId) return visibleTaskSet.has(notification.taskId);
        return true;
      })
      .slice(0, 50);

    return successResponse('Notifications retrieved', { notifications: filteredNotifications }, 200);
  } catch (error: unknown) {
    console.error('Get notifications error:', error);
    return serverErrorResponse('An error occurred while fetching notifications');
  }
}
