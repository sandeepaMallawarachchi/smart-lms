// /app/api/projects-and-tasks/lecturer/create-projects-and-tasks/project/[projectId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Project, StudentProjectProgress } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { connectDB } from '@/lib/db';
import {
  cancelReminderJobsForStudentItem,
  scheduleReminderJobsForStudentItem,
} from '@/lib/projects-and-tasks/reminders/scheduler';
import CourseGroup from '@/model/CourseGroup';
import Course from '@/model/Course';

type ProjectWithGroupsLite = {
  courseId: string;
  deadlineDate: string;
  deadlineTime?: string;
  projectName: string;
  assignedGroupIds?: string[];
  mainTasks?: IncomingMainTask[];
  isPublished?: boolean;
} & Record<string, unknown>;

type IncomingSubtask = { id?: string; title?: string; description?: string; marks?: number | string };
type IncomingMainTask = {
  id?: string;
  title?: string;
  description?: string;
  marks?: number | string;
  subtasks?: IncomingSubtask[];
};

function normalizeProjectMainTasks(mainTasks: unknown): { ok: true; value: IncomingMainTask[] } | { ok: false; message: string } {
  if (!Array.isArray(mainTasks)) {
    return { ok: false, message: 'Main tasks must be an array' };
  }

  const normalized: IncomingMainTask[] = [];
  let totalMainMarks = 0;

  for (const rawTask of mainTasks) {
    const task = (rawTask || {}) as IncomingMainTask;
    const marks = Number(task.marks ?? 0);
    if (!Number.isFinite(marks) || marks < 0 || marks > 100) {
      return { ok: false, message: 'Each main task mark must be between 0 and 100' };
    }

    totalMainMarks += marks;
    if (totalMainMarks > 100) {
      return { ok: false, message: 'Total main task marks cannot exceed 100' };
    }

    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    let subtaskTotal = 0;
    const normalizedSubtasks: IncomingSubtask[] = [];

    for (const rawSubtask of subtasks) {
      const subtask = (rawSubtask || {}) as IncomingSubtask;
      const subtaskMarks = Number(subtask.marks ?? 0);
      if (!Number.isFinite(subtaskMarks) || subtaskMarks < 0) {
        return { ok: false, message: 'Each subtask mark must be zero or a positive number' };
      }
      subtaskTotal += subtaskMarks;
      normalizedSubtasks.push({
        id: String(subtask.id || ''),
        title: String(subtask.title || ''),
        description: String(subtask.description || ''),
        marks: subtaskMarks,
      });
    }

    if (subtaskTotal > marks) {
      return { ok: false, message: `Subtask marks cannot exceed main task marks for "${String(task.title || 'Untitled task')}"` };
    }

    normalized.push({
      id: String(task.id || ''),
      title: String(task.title || ''),
      description: String(task.description || ''),
      marks,
      subtasks: normalizedSubtasks,
    });
  }

  return { ok: true, value: normalized };
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();

    const { projectId } = await props.params;

    if (!projectId) {
      return NextResponse.json(
        { message: 'Project ID is required' },
        { status: 400 }
      );
    }

    const project = await Project.findById(projectId).lean();

    if (!project) {
      return NextResponse.json(
        { message: 'Project not found' },
        { status: 404 }
      );
    }

    const projectWithGroups = project as ProjectWithGroupsLite;
    const assignedGroupsRaw = projectWithGroups.assignedGroupIds?.length
      ? await CourseGroup.find({
          _id: { $in: projectWithGroups.assignedGroupIds },
          isArchived: false,
        })
          .select('_id groupName')
          .lean()
      : [];
    const assignedGroups = assignedGroupsRaw.map((group) => ({
      _id: (group as { _id: { toString(): string } })._id.toString(),
      groupName: String((group as { groupName?: string }).groupName || ''),
    }));

    // Enrich with course data
    let courseData = undefined;
    if (projectWithGroups.courseId) {
      const courseDoc = await Course.findById(projectWithGroups.courseId)
        .select('_id courseName courseCode')
        .lean();
      if (courseDoc) {
        courseData = courseDoc;
      }
    }

    return NextResponse.json(
      {
        message: 'Project fetched successfully',
        data: {
          ...project,
          assignedGroups,
          course: courseData,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Fetch project error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();

    // ✅ IMPORTANT: Await params in Next.js 15+
    const { projectId } = await props.params;
    
    console.log('=== PUT Request ===');
    console.log('projectId from params:', projectId);
    
    // Validate projectId from URL params
    if (!projectId) {
      console.error('Missing projectId in URL params');
      return NextResponse.json(
        { message: 'Project ID is required' },
        { status: 400 }
      );
    }

    const existingProject = (await Project.findById(projectId).lean()) as ProjectWithGroupsLite | null;
    if (!existingProject) {
      return NextResponse.json(
        { message: 'Project not found' },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      projectName?: string;
      description?: { html: string; text: string };
      projectType?: 'group' | 'individual';
      assignedGroupIds?: string[];
      deadlineDate?: string;
      deadlineTime?: string;
      specialNotes?: { html: string; text: string };
      mainTasks?: IncomingMainTask[];
      isPublished?: boolean;
    };
    console.log('Request body:', body);

    // Validate required fields
    if (!body.projectName?.trim()) {
      return NextResponse.json(
        { message: 'Project name is required' },
        { status: 400 }
      );
    }

    if (!body.projectType || !['group', 'individual'].includes(body.projectType)) {
      return NextResponse.json(
        { message: 'Valid project type is required' },
        { status: 400 }
      );
    }

    if (!body.deadlineDate) {
      return NextResponse.json(
        { message: 'Deadline date is required' },
        { status: 400 }
      );
    }

    const mainTasksSource = body.mainTasks ?? existingProject.mainTasks ?? [];
    const normalizedMainTasksResult = normalizeProjectMainTasks(mainTasksSource);
    if (!normalizedMainTasksResult.ok) {
      return NextResponse.json(
        { message: normalizedMainTasksResult.message },
        { status: 400 }
      );
    }
    const normalizedMainTasks = normalizedMainTasksResult.value;

    const normalizedAssignedGroupIds = Array.isArray(body.assignedGroupIds)
      ? [...new Set(body.assignedGroupIds.map((id: string) => id.toString()))]
      : [];
    if (body.projectType === 'group') {
      if (normalizedAssignedGroupIds.length === 0) {
        return NextResponse.json(
          { message: 'At least one group must be selected for a group project' },
          { status: 400 }
        );
      }

      const validGroups = await CourseGroup.find({
        _id: { $in: normalizedAssignedGroupIds },
        courseId: existingProject.courseId,
        isArchived: false,
      })
        .select('_id')
        .lean();

      if (validGroups.length !== normalizedAssignedGroupIds.length) {
        return NextResponse.json(
          { message: 'One or more selected groups are invalid for this course' },
          { status: 400 }
        );
      }
    }

    console.log('All validations passed, updating project...');

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        projectName: body.projectName.trim(),
        description: body.description || { html: '', text: '' },
        projectType: body.projectType,
        assignedGroupIds: body.projectType === 'group' ? normalizedAssignedGroupIds : [],
        deadlineDate: body.deadlineDate,
        deadlineTime: body.deadlineTime || '23:59',
        specialNotes: body.specialNotes || { html: '', text: '' },
        mainTasks: normalizedMainTasks,
        isPublished: typeof body.isPublished === 'boolean' ? body.isPublished : existingProject.isPublished ?? true,
      },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      console.error('Project not found for ID:', projectId);
      return NextResponse.json(
        { message: 'Project not found' },
        { status: 404 }
      );
    }

    const shouldRescheduleReminders =
      existingProject.deadlineDate !== updatedProject.deadlineDate ||
      (existingProject.deadlineTime || '23:59') !== (updatedProject.deadlineTime || '23:59') ||
      existingProject.projectName !== updatedProject.projectName;
    const publishStateChanged = (existingProject.isPublished ?? true) !== (updatedProject.isPublished ?? true);

    if (shouldRescheduleReminders || publishStateChanged) {
      const activeProgress = await StudentProjectProgress.find({
        projectId,
        status: { $ne: 'done' },
      })
        .select('studentId')
        .lean();

      if (updatedProject.isPublished) {
        await Promise.all(
          activeProgress.map((row: { studentId: string }) =>
            scheduleReminderJobsForStudentItem({
              studentId: row.studentId,
              itemType: 'project',
              itemId: projectId,
              itemName: updatedProject.projectName,
              deadlineDate: updatedProject.deadlineDate,
              deadlineTime: updatedProject.deadlineTime || '23:59',
              startAt: existingProject.createdAt || updatedProject.createdAt,
            })
          )
        );
      } else {
        await Promise.all(
          activeProgress.map((row: { studentId: string }) =>
            cancelReminderJobsForStudentItem({
              studentId: row.studentId,
              projectId,
            })
          )
        );
      }
    }

    console.log('Project updated successfully');

    const updatedProjectWithGroups = updatedProject.toObject() as ProjectWithGroupsLite;
    const assignedGroupsRaw = updatedProjectWithGroups.assignedGroupIds?.length
      ? await CourseGroup.find({
          _id: { $in: updatedProjectWithGroups.assignedGroupIds },
          isArchived: false,
        })
          .select('_id groupName')
          .lean()
      : [];
    const assignedGroups = assignedGroupsRaw.map((group) => ({
      _id: (group as { _id: { toString(): string } })._id.toString(),
      groupName: String((group as { groupName?: string }).groupName || ''),
    }));

    return NextResponse.json(
      {
        message: 'Project updated successfully',
        data: {
          ...updatedProjectWithGroups,
          assignedGroups,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update project' },
      { status: 500 }
    );
  }
}
