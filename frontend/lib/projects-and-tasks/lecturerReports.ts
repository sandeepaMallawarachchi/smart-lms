import Course from '@/model/Course';
import CourseGroup from '@/model/CourseGroup';
import { Project, StudentProjectProgress, StudentTaskProgress, Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { getEligibleStudentsForCourse } from '@/lib/course-students';

export type ReportItemType = 'all' | 'project' | 'task';

export interface BuildLecturerReportParams {
  courseId: string;
  itemType: ReportItemType;
  studentId?: string;
}

export type ReportStudentRow = {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  assigned: number;
  done: number;
  inProgress: number;
  todo: number;
  overdue: number;
  completionRate: number;
  lastActivity: string | null;
};

export type LecturerReportData = {
  courseId: string;
  courseName: string;
  generatedAt: string;
  itemType: ReportItemType;
  kpis: {
    totalStudents: number;
    totalAssigned: number;
    totalDone: number;
    totalInProgress: number;
    totalTodo: number;
    totalOverdue: number;
    completionRate: number;
  };
  students: ReportStudentRow[];
  studentsOptions: Array<{
    _id: string;
    name: string;
    studentIdNumber: string;
  }>;
};

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
  updatedAt?: Date | string;
};

type AssignedItem = {
  itemType: 'project' | 'task';
  itemId: string;
  dueAt: Date | null;
};

function parseDeadline(deadlineDate?: string, deadlineTime?: string): Date | null {
  if (!deadlineDate) return null;
  const parsed = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function assertLecturerCourseAccess(courseId: string, lecturerId: string): Promise<boolean> {
  const hasAccess = await Course.exists({
    _id: courseId,
    $or: [{ lecturerInCharge: lecturerId }, { lecturers: lecturerId }],
  });
  return Boolean(hasAccess);
}

export async function buildLecturerReport(
  params: BuildLecturerReportParams
): Promise<LecturerReportData | null> {
  const { courseId, itemType, studentId } = params;

  const eligible = await getEligibleStudentsForCourse(courseId);
  if (!eligible) return null;

  const eligibleStudents = eligible.students as StudentLite[];
  const eligibleStudentIdSet = new Set(eligibleStudents.map((student) => student._id.toString()));

  let targetStudentIds = [...eligibleStudentIdSet];
  if (studentId) {
    if (!eligibleStudentIdSet.has(studentId)) {
      throw new Error('INVALID_STUDENT');
    }
    targetStudentIds = [studentId];
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
    groups.map((group) => [
      group._id.toString(),
      (group.studentIds || []).filter((id) => eligibleStudentIdSet.has(id)),
    ])
  );

  const assignments = new Map<string, AssignedItem[]>();
  targetStudentIds.forEach((id) => assignments.set(id, []));

  if (itemType === 'all' || itemType === 'project') {
    projects.forEach((project) => {
      const item: AssignedItem = {
        itemType: 'project',
        itemId: project._id.toString(),
        dueAt: parseDeadline(project.deadlineDate, project.deadlineTime),
      };

      let assignedStudentIds: string[] = targetStudentIds;
      if (project.projectType === 'group' && Array.isArray(project.assignedGroupIds) && project.assignedGroupIds.length > 0) {
        const inGroups = new Set<string>();
        project.assignedGroupIds.forEach((groupId) => {
          (groupToStudents.get(groupId) || []).forEach((id) => inGroups.add(id));
        });
        assignedStudentIds = targetStudentIds.filter((id) => inGroups.has(id));
      }

      assignedStudentIds.forEach((id) => assignments.get(id)?.push(item));
    });
  }

  if (itemType === 'all' || itemType === 'task') {
    tasks.forEach((task) => {
      const item: AssignedItem = {
        itemType: 'task',
        itemId: task._id.toString(),
        dueAt: parseDeadline(task.deadlineDate, task.deadlineTime),
      };
      targetStudentIds.forEach((id) => assignments.get(id)?.push(item));
    });
  }

  const projectProgressMap = new Map(
    projectProgress.map((row) => [`${row.studentId}:${row.projectId}`, row.status || 'todo'])
  );
  const taskProgressMap = new Map(
    taskProgress.map((row) => [`${row.studentId}:${row.taskId}`, row.status || 'todo'])
  );

  const lastActivityMap = new Map<string, number>();
  [...projectProgress, ...taskProgress].forEach((row) => {
    const updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
    if (!updatedAt || Number.isNaN(updatedAt.getTime())) return;
    const current = lastActivityMap.get(row.studentId) || 0;
    if (updatedAt.getTime() > current) {
      lastActivityMap.set(row.studentId, updatedAt.getTime());
    }
  });

  const now = Date.now();
  const studentRows: ReportStudentRow[] = eligibleStudents
    .filter((student) => targetStudentIds.includes(student._id.toString()))
    .map((student) => {
      const id = student._id.toString();
      const assignedItems = assignments.get(id) || [];
      let done = 0;
      let inProgress = 0;
      let todo = 0;
      let overdue = 0;

      assignedItems.forEach((item) => {
        const status =
          item.itemType === 'project'
            ? projectProgressMap.get(`${id}:${item.itemId}`) || 'todo'
            : taskProgressMap.get(`${id}:${item.itemId}`) || 'todo';

        if (status === 'done') done += 1;
        else if (status === 'inprogress') inProgress += 1;
        else todo += 1;

        if (status !== 'done' && item.dueAt && item.dueAt.getTime() < now) overdue += 1;
      });

      const completionRate = assignedItems.length
        ? Number(((done / assignedItems.length) * 100).toFixed(1))
        : 0;

      return {
        studentId: id,
        studentName: student.name || '',
        studentIdNumber: student.studentIdNumber || '',
        assigned: assignedItems.length,
        done,
        inProgress,
        todo,
        overdue,
        completionRate,
        lastActivity: lastActivityMap.get(id)
          ? new Date(lastActivityMap.get(id) as number).toISOString()
          : null,
      };
    })
    .sort((a, b) => b.completionRate - a.completionRate);

  const totalAssigned = studentRows.reduce((sum, row) => sum + row.assigned, 0);
  const totalDone = studentRows.reduce((sum, row) => sum + row.done, 0);
  const totalInProgress = studentRows.reduce((sum, row) => sum + row.inProgress, 0);
  const totalTodo = studentRows.reduce((sum, row) => sum + row.todo, 0);
  const totalOverdue = studentRows.reduce((sum, row) => sum + row.overdue, 0);

  const report: LecturerReportData = {
    courseId,
    courseName: eligible.course.courseName,
    generatedAt: new Date().toISOString(),
    itemType,
    kpis: {
      totalStudents: studentRows.length,
      totalAssigned,
      totalDone,
      totalInProgress,
      totalTodo,
      totalOverdue,
      completionRate: totalAssigned ? Number(((totalDone / totalAssigned) * 100).toFixed(1)) : 0,
    },
    students: studentRows,
    studentsOptions: eligibleStudents.map((student) => ({
      _id: student._id.toString(),
      name: student.name || '',
      studentIdNumber: student.studentIdNumber || '',
    })),
  };

  return report;
}
