import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import Course from '@/model/Course';
import CourseGroup from '@/model/CourseGroup';
import Alert from '@/model/projects-and-tasks/lecturer/Alert';
import { getEligibleStudentsForCourse } from '@/lib/course-students';
import { Project, StudentProjectProgress, StudentTaskProgress, Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';

type StudentLite = {
  _id: { toString(): string };
  name?: string;
  studentIdNumber?: string;
};

type CreateAlertBody = {
  courseId?: string;
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
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return errorResponse('Valid course ID is required', { courseId: ['Course ID is required'] }, 400);
    }

    const hasAccess = await assertLecturerCourseAccess(courseId, payload.userId);
    if (!hasAccess) {
      return unauthorizedResponse('You do not have access to this module');
    }

    const courseAndStudents = await getEligibleStudentsForCourse(courseId);
    if (!courseAndStudents) {
      return errorResponse('Module not found', { course: ['Module not found'] }, 404);
    }

    const students = courseAndStudents.students as StudentLite[];
    const studentMap = new Map(
      students.map((student) => [
        student._id.toString(),
        {
          _id: student._id.toString(),
          name: student.name || '',
          studentIdNumber: student.studentIdNumber || '',
        },
      ])
    );

    const groups = await CourseGroup.find({ courseId, isArchived: false }).select('_id groupName').lean();
    const groupMap = new Map(groups.map((group: any) => [group._id.toString(), group.groupName || 'Group']));

    const alerts = await Alert.find({ courseId, lecturerId: payload.userId }).sort({ createdAt: -1 }).lean();
    const enrichedAlerts = alerts.map((alert: any) => ({
      ...alert,
      recipientStudents: (alert.recipientStudentIds || [])
        .map((studentId: string) => studentMap.get(studentId))
        .filter(Boolean),
      groupName: alert.groupId ? groupMap.get(alert.groupId) : undefined,
    }));

    return successResponse(
      'Alerts fetched successfully',
      {
        alerts: enrichedAlerts,
        students: students.map((student) => ({
          _id: student._id.toString(),
          name: student.name || '',
          studentIdNumber: student.studentIdNumber || '',
        })),
        groups: groups.map((group: any) => ({
          _id: group._id.toString(),
          groupName: group.groupName || 'Group',
        })),
      },
      200
    );
  } catch (error: unknown) {
    console.error('Get alerts error:', error);
    return serverErrorResponse('An error occurred while fetching alerts');
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const payload = verifyToken(token);
    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Unauthorized access - Only lecturers can access this endpoint');
    }

    const body = (await request.json()) as CreateAlertBody;
    const courseId = body.courseId?.toString() || '';
    const level = body.level;
    const message = body.message?.trim() || '';
    const targetMode = body.targetMode;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return errorResponse('Valid course ID is required', { courseId: ['Course ID is required'] }, 400);
    }
    if (!level || !['low', 'medium', 'high'].includes(level)) {
      return errorResponse('Valid alert level is required', { level: ['Use low, medium, or high'] }, 400);
    }
    if (!message) {
      return errorResponse('Alert message is required', { message: ['Message is required'] }, 400);
    }
    if (!targetMode || !['student', 'students', 'group', 'filter'].includes(targetMode)) {
      return errorResponse('Valid target mode is required', { targetMode: ['Invalid target mode'] }, 400);
    }

    const hasAccess = await assertLecturerCourseAccess(courseId, payload.userId);
    if (!hasAccess) {
      return unauthorizedResponse('You do not have access to this module');
    }

    const courseAndStudents = await getEligibleStudentsForCourse(courseId);
    if (!courseAndStudents) {
      return errorResponse('Module not found', { course: ['Module not found'] }, 404);
    }

    const students = courseAndStudents.students as StudentLite[];
    const eligibleIds = new Set(students.map((student) => student._id.toString()));

    let recipientStudentIds: string[] = [];
    if (targetMode === 'student') {
      const studentId = body.studentId?.toString() || '';
      if (!studentId || !eligibleIds.has(studentId)) {
        return errorResponse('Valid student is required', { studentId: ['Select a student from this module'] }, 400);
      }
      recipientStudentIds = [studentId];
    } else if (targetMode === 'students') {
      const selected = (body.studentIds || []).map((id) => id.toString()).filter(Boolean);
      const unique = [...new Set(selected)].filter((id) => eligibleIds.has(id));
      if (unique.length === 0) {
        return errorResponse('At least one student is required', { studentIds: ['Select students from this module'] }, 400);
      }
      recipientStudentIds = unique;
    } else if (targetMode === 'group') {
      const groupId = body.groupId?.toString() || '';
      if (!groupId) {
        return errorResponse('Group is required', { groupId: ['Select a group'] }, 400);
      }
      const group = await CourseGroup.findOne({ _id: groupId, courseId, isArchived: false }).lean();
      if (!group) {
        return errorResponse('Group not found', { groupId: ['Invalid group for selected module'] }, 400);
      }
      recipientStudentIds = (group.studentIds || [])
        .map((id: unknown) => String(id))
        .filter((id: string) => eligibleIds.has(id));
      if (recipientStudentIds.length === 0) {
        return errorResponse('Group has no eligible students', { groupId: ['Selected group has no students'] }, 400);
      }
    } else if (targetMode === 'filter') {
      const filterType = body.filterType;
      if (!filterType || !['all_students', 'at_risk', 'low_activity'].includes(filterType)) {
        return errorResponse('Valid filter type is required', { filterType: ['Select a valid filter'] }, 400);
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
          (projects as any[]).map((p) => [p._id.toString(), p.deadlineDate ? new Date(`${p.deadlineDate}T${p.deadlineTime || '23:59'}:00`).getTime() : null])
        );
        const taskDeadline = new Map(
          (tasks as any[]).map((t) => [t._id.toString(), t.deadlineDate ? new Date(`${t.deadlineDate}T${t.deadlineTime || '23:59'}:00`).getTime() : null])
        );
        const risky = new Set<string>();
        [...projectProgress, ...taskProgress].forEach((row: any) => {
          const studentId = String(row.studentId);
          const status = row.status || 'todo';
          const deadline =
            'projectId' in row ? projectDeadline.get(String(row.projectId)) : taskDeadline.get(String(row.taskId));
          if (status !== 'done' && deadline && deadline < now) risky.add(studentId);
        });
        recipientStudentIds = [...risky].filter((id) => eligibleIds.has(id));
      } else if (filterType === 'low_activity') {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - 14);
        const [projectProgress, taskProgress] = await Promise.all([
          StudentProjectProgress.find({ studentId: { $in: [...eligibleIds] } }).select('studentId updatedAt').lean(),
          StudentTaskProgress.find({ studentId: { $in: [...eligibleIds] } }).select('studentId updatedAt').lean(),
        ]);
        const activeRecently = new Set<string>();
        [...projectProgress, ...taskProgress].forEach((row: any) => {
          const updated = row.updatedAt ? new Date(row.updatedAt) : null;
          if (updated && updated >= threshold) activeRecently.add(String(row.studentId));
        });
        recipientStudentIds = [...eligibleIds].filter((id) => !activeRecently.has(id));
      }

      if (recipientStudentIds.length === 0) {
        return errorResponse('No recipients found for selected filter', { filterType: ['No students matched'] }, 400);
      }
    }

    const created = await Alert.create({
      courseId,
      lecturerId: payload.userId,
      level,
      message,
      targetMode,
      filterType: targetMode === 'filter' ? body.filterType : undefined,
      groupId: targetMode === 'group' ? body.groupId : undefined,
      recipientStudentIds: [...new Set(recipientStudentIds)],
    });

    return successResponse('Alert created successfully', { alert: created }, 201);
  } catch (error: unknown) {
    console.error('Create alert error:', error);
    return serverErrorResponse('An error occurred while creating alert');
  }
}
