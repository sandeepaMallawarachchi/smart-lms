import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import Course from '@/model/Course';
import CourseGroup from '@/model/CourseGroup';
import Alert from '@/model/projects-and-tasks/lecturer/Alert';
import { Notification } from '@/model/projects-and-tasks/notificationModel';
import { getEligibleStudentsForCourse } from '@/lib/course-students';
import { Project, StudentProjectProgress, StudentTaskProgress, Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';

type StudentLite = {
  _id: { toString(): string };
};
type CourseLite = {
  courseName?: string;
};
type DeadlineItem = {
  _id: { toString(): string };
  deadlineDate?: string;
  deadlineTime?: string;
};
type StatusProgressRow = {
  studentId: string;
  status?: string;
  projectId?: string;
  taskId?: string;
};
type ActivityProgressRow = {
  studentId: string;
  updatedAt?: string | Date;
};

type UpdateAlertBody = {
  level?: 'low' | 'medium' | 'high';
  message?: string;
  targetMode?: 'student' | 'students' | 'group' | 'filter';
  studentId?: string;
  studentIds?: string[];
  groupId?: string;
  filterType?: 'all_students' | 'at_risk' | 'low_activity';
};

async function assertLecturerCourseAccess(courseId: string, lecturerId: string) {
  const hasAccess = await Course.exists({
    _id: courseId,
    $or: [{ lecturerInCharge: lecturerId }, { lecturers: lecturerId }],
  });
  return Boolean(hasAccess);
}

async function syncAlertNotifications(params: {
  alertId: string;
  recipientStudentIds: string[];
  level: 'low' | 'medium' | 'high';
  message: string;
  courseName?: string;
}) {
  const academicLevelLabel: Record<'low' | 'medium' | 'high', string> = {
    low: 'General Guidance',
    medium: 'Priority Review',
    high: 'Immediate Action',
  };
  const now = new Date();
  const title = `${academicLevelLabel[params.level]}${params.courseName ? ` • ${params.courseName}` : ''}`;
  const description = `Message from lecturer (${params.level} priority)`;

  await Notification.deleteMany({ sourceAlertId: params.alertId });
  if (params.recipientStudentIds.length === 0) return;

  await Notification.insertMany(
    params.recipientStudentIds.map((studentId) => ({
      studentId,
      sourceAlertId: params.alertId,
      alertLevel: params.level,
      type: 'lecturer_alert' as const,
      title,
      message: params.message,
      description,
      dedupeKey: `lecturer_alert:${params.alertId}:${studentId}`,
      isRead: false,
      isSent: true,
      sentAt: now,
      scheduledFor: now,
    }))
  );
}

async function resolveRecipients(
  courseId: string,
  targetMode: 'student' | 'students' | 'group' | 'filter',
  body: UpdateAlertBody,
  eligibleIds: Set<string>
) {
  let recipientStudentIds: string[] = [];

  if (targetMode === 'student') {
    const studentId = body.studentId?.toString() || '';
    if (!studentId || !eligibleIds.has(studentId)) {
      return { error: errorResponse('Valid student is required', { studentId: ['Select a student from this module'] }, 400) };
    }
    recipientStudentIds = [studentId];
  } else if (targetMode === 'students') {
    const selected = (body.studentIds || []).map((id) => id.toString()).filter(Boolean);
    const unique = [...new Set(selected)].filter((id) => eligibleIds.has(id));
    if (unique.length === 0) {
      return { error: errorResponse('At least one student is required', { studentIds: ['Select students from this module'] }, 400) };
    }
    recipientStudentIds = unique;
  } else if (targetMode === 'group') {
    const groupId = body.groupId?.toString() || '';
    if (!groupId) {
      return { error: errorResponse('Group is required', { groupId: ['Select a group'] }, 400) };
    }
    const group = await CourseGroup.findOne({ _id: groupId, courseId, isArchived: false }).lean();
    if (!group) {
      return { error: errorResponse('Group not found', { groupId: ['Invalid group for selected module'] }, 400) };
    }
    recipientStudentIds = (group.studentIds || [])
      .map((id: unknown) => String(id))
      .filter((id: string) => eligibleIds.has(id));

    if (recipientStudentIds.length === 0) {
      return { error: errorResponse('Group has no eligible students', { groupId: ['Selected group has no students'] }, 400) };
    }
  } else {
    const filterType = body.filterType;
    if (!filterType || !['all_students', 'at_risk', 'low_activity'].includes(filterType)) {
      return { error: errorResponse('Valid filter type is required', { filterType: ['Select a valid filter'] }, 400) };
    }

    if (filterType === 'all_students') {
      recipientStudentIds = [...eligibleIds];
    } else if (filterType === 'at_risk') {
      const [projectProgress, taskProgress, projects, tasks] = await Promise.all([
        StudentProjectProgress.find({ studentId: { $in: [...eligibleIds] } }).select('studentId projectId status').lean(),
        StudentTaskProgress.find({ studentId: { $in: [...eligibleIds] } }).select('studentId taskId status').lean(),
        Project.find({ courseId }).select('_id deadlineDate deadlineTime').lean(),
        Task.find({ courseId }).select('_id deadlineDate deadlineTime').lean(),
      ]);

      const now = Date.now();
      const projectDeadline = new Map(
        (projects as DeadlineItem[]).map((project) => [
          project._id.toString(),
          project.deadlineDate ? new Date(`${project.deadlineDate}T${project.deadlineTime || '23:59'}:00`).getTime() : null,
        ])
      );
      const taskDeadline = new Map(
        (tasks as DeadlineItem[]).map((task) => [
          task._id.toString(),
          task.deadlineDate ? new Date(`${task.deadlineDate}T${task.deadlineTime || '23:59'}:00`).getTime() : null,
        ])
      );
      const risky = new Set<string>();
      [...projectProgress, ...taskProgress].forEach((row) => {
        const typedRow = row as StatusProgressRow;
        const studentId = String(typedRow.studentId);
        const status = typedRow.status || 'todo';
        const deadline =
          typedRow.projectId
            ? projectDeadline.get(String(typedRow.projectId))
            : taskDeadline.get(String(typedRow.taskId));
        if (status !== 'done' && deadline && deadline < now) {
          risky.add(studentId);
        }
      });
      recipientStudentIds = [...risky].filter((id) => eligibleIds.has(id));
    } else {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - 14);
      const [projectProgress, taskProgress] = await Promise.all([
        StudentProjectProgress.find({ studentId: { $in: [...eligibleIds] } }).select('studentId updatedAt').lean(),
        StudentTaskProgress.find({ studentId: { $in: [...eligibleIds] } }).select('studentId updatedAt').lean(),
      ]);
      const activeRecently = new Set<string>();
      [...projectProgress, ...taskProgress].forEach((row) => {
        const typedRow = row as ActivityProgressRow;
        const updated = typedRow.updatedAt ? new Date(typedRow.updatedAt) : null;
        if (updated && updated >= threshold) {
          activeRecently.add(String(typedRow.studentId));
        }
      });
      recipientStudentIds = [...eligibleIds].filter((id) => !activeRecently.has(id));
    }

    if (recipientStudentIds.length === 0) {
      return { error: errorResponse('No recipients found for selected filter', { filterType: ['No students matched'] }, 400) };
    }
  }

  return { recipientStudentIds };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Unauthorized access - Only lecturers can access this endpoint');
    }

    const { alertId } = await params;
    if (!mongoose.Types.ObjectId.isValid(alertId)) {
      return errorResponse('Invalid alert ID', { alertId: ['Invalid alert ID'] }, 400);
    }

    const existingAlert = await Alert.findById(alertId);
    if (!existingAlert) {
      return errorResponse('Alert not found', { alert: ['Alert not found'] }, 404);
    }

    if (existingAlert.lecturerId !== payload.userId) {
      return unauthorizedResponse('You do not have access to this alert');
    }

    const hasAccess = await assertLecturerCourseAccess(existingAlert.courseId, payload.userId);
    if (!hasAccess) {
      return unauthorizedResponse('You do not have access to this module');
    }

    const body = (await request.json()) as UpdateAlertBody;
    const level = body.level;
    const message = body.message?.trim() || '';
    const targetMode = body.targetMode;

    if (!level || !['low', 'medium', 'high'].includes(level)) {
      return errorResponse('Valid alert level is required', { level: ['Use low, medium, or high'] }, 400);
    }
    if (!message) {
      return errorResponse('Alert message is required', { message: ['Message is required'] }, 400);
    }
    if (!targetMode || !['student', 'students', 'group', 'filter'].includes(targetMode)) {
      return errorResponse('Valid target mode is required', { targetMode: ['Invalid target mode'] }, 400);
    }

    const courseAndStudents = await getEligibleStudentsForCourse(existingAlert.courseId);
    if (!courseAndStudents) {
      return errorResponse('Module not found', { course: ['Module not found'] }, 404);
    }
    const students = courseAndStudents.students as StudentLite[];
    const eligibleIds = new Set(students.map((student) => student._id.toString()));

    const resolved = await resolveRecipients(existingAlert.courseId, targetMode, body, eligibleIds);
    if ('error' in resolved) {
      return resolved.error;
    }

    existingAlert.level = level;
    existingAlert.message = message;
    existingAlert.targetMode = targetMode;
    existingAlert.filterType = targetMode === 'filter' ? body.filterType : undefined;
    existingAlert.groupId = targetMode === 'group' ? body.groupId : undefined;
    existingAlert.recipientStudentIds = [...new Set(resolved.recipientStudentIds)];
    await existingAlert.save();

    const course = courseAndStudents.course as CourseLite;
    await syncAlertNotifications({
      alertId: existingAlert._id.toString(),
      recipientStudentIds: existingAlert.recipientStudentIds,
      level,
      message,
      courseName: course.courseName,
    });

    return successResponse('Alert updated successfully', { alert: existingAlert }, 200);
  } catch (error: unknown) {
    console.error('Update alert error:', error);
    return serverErrorResponse('An error occurred while updating alert');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Unauthorized access - Only lecturers can access this endpoint');
    }

    const { alertId } = await params;
    if (!mongoose.Types.ObjectId.isValid(alertId)) {
      return errorResponse('Invalid alert ID', { alertId: ['Invalid alert ID'] }, 400);
    }

    const existingAlert = await Alert.findById(alertId);
    if (!existingAlert) {
      return errorResponse('Alert not found', { alert: ['Alert not found'] }, 404);
    }

    if (existingAlert.lecturerId !== payload.userId) {
      return unauthorizedResponse('You do not have access to this alert');
    }

    const hasAccess = await assertLecturerCourseAccess(existingAlert.courseId, payload.userId);
    if (!hasAccess) {
      return unauthorizedResponse('You do not have access to this module');
    }

    await Alert.deleteOne({ _id: alertId });
    await Notification.deleteMany({ sourceAlertId: alertId });

    return successResponse('Alert deleted successfully', {}, 200);
  } catch (error: unknown) {
    console.error('Delete alert error:', error);
    return serverErrorResponse('An error occurred while deleting alert');
  }
}
