// /app/api/projects-and-tasks/lecturer/create-projects-and-tasks/project/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Project } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { connectDB } from '@/lib/db';
import { uploadFileToS3, validateFile } from '@/lib/s3-upload';
import CourseGroup from '@/model/CourseGroup';
import Course from '@/model/Course';
import { getEligibleStudentsForCourse } from '@/lib/course-students';
import { scheduleReminderJobsForStudentItem } from '@/lib/projects-and-tasks/reminders/scheduler';

type ProjectWithGroupsLite = { assignedGroupIds?: string[] } & Record<string, unknown>;
type GroupLite = { _id: { toString(): string } } & Record<string, unknown>;
type IncomingSubtask = { id?: string; title?: string; description?: string; marks?: number | string };
type IncomingMainTask = {
  id?: string;
  title?: string;
  description?: string;
  marks?: number | string;
  subtasks?: IncomingSubtask[];
};
type GroupStudentsLite = { studentIds?: unknown[] };
type EligibleStudentLite = { _id: { toString(): string } };

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

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const formData = await request.formData();

    // Extract form fields
    const courseId = formData.get('courseId') as string;
    const lecturerId = formData.get('lecturerId') as string;
    const projectName = formData.get('projectName') as string;
    const projectType = formData.get('projectType') as string;
    const deadlineDate = formData.get('deadlineDate') as string;
    const deadlineTime = formData.get('deadlineTime') as string;

    // Parse JSON fields
    const description = JSON.parse(
      (formData.get('description') as string) || '{"html":"","text":""}'
    );
    const specialNotes = JSON.parse(
      (formData.get('specialNotes') as string) || '{"html":"","text":""}'
    );
    const mainTasksRaw = JSON.parse((formData.get('mainTasks') as string) || '[]');
    const assignedGroupIds = JSON.parse((formData.get('assignedGroupIds') as string) || '[]');

    // Validation
    if (!courseId) {
      return NextResponse.json(
        { message: 'Course ID is required' },
        { status: 400 }
      );
    }

    if (!projectName || !projectName.trim()) {
      return NextResponse.json(
        { message: 'Project name is required' },
        { status: 400 }
      );
    }

    if (!projectType || !['group', 'individual'].includes(projectType)) {
      return NextResponse.json(
        { message: 'Valid project type is required (group or individual)' },
        { status: 400 }
      );
    }

    if (!deadlineDate) {
      return NextResponse.json(
        { message: 'Deadline date is required' },
        { status: 400 }
      );
    }

    const normalizedMainTasksResult = normalizeProjectMainTasks(mainTasksRaw);
    if (!normalizedMainTasksResult.ok) {
      return NextResponse.json(
        { message: normalizedMainTasksResult.message },
        { status: 400 }
      );
    }
    const mainTasks = normalizedMainTasksResult.value;

    const normalizedAssignedGroupIds = Array.isArray(assignedGroupIds)
      ? [...new Set(assignedGroupIds.map((id: string) => id.toString()))]
      : [];

    if (projectType === 'group') {
      if (normalizedAssignedGroupIds.length === 0) {
        return NextResponse.json(
          { message: 'At least one group must be selected for a group project' },
          { status: 400 }
        );
      }

      const validGroups = await CourseGroup.find({
        _id: { $in: normalizedAssignedGroupIds },
        courseId,
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

    // Handle file uploads
    const templateDocuments = [];
    const otherDocuments = [];
    const images = [];

    // Process template documents
    const templateFiles = formData.getAll('templateDocuments') as File[];
    for (const file of templateFiles) {
      if (file.size > 0) {
        const validation = validateFile(file, 50);
        if (!validation.valid) {
          return NextResponse.json(
            { message: `Template document error: ${validation.error}` },
            { status: 400 }
          );
        }

        const buffer = await file.arrayBuffer();
        const uploaded = await uploadFileToS3(
          Buffer.from(buffer),
          file.name,
          `projects/${courseId}/${projectName}/template-docs`
        );
        templateDocuments.push(uploaded);
      }
    }

    // Process other documents
    const otherFiles = formData.getAll('otherDocuments') as File[];
    for (const file of otherFiles) {
      if (file.size > 0) {
        const validation = validateFile(file, 50);
        if (!validation.valid) {
          return NextResponse.json(
            { message: `Document error: ${validation.error}` },
            { status: 400 }
          );
        }

        const buffer = await file.arrayBuffer();
        const uploaded = await uploadFileToS3(
          Buffer.from(buffer),
          file.name,
          `projects/${courseId}/${projectName}/documents`
        );
        otherDocuments.push(uploaded);
      }
    }

    // Process images
    const imageFiles = formData.getAll('images') as File[];
    for (const file of imageFiles) {
      if (file.size > 0) {
        const validation = validateFile(file, 10, ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
        if (!validation.valid) {
          return NextResponse.json(
            { message: `Image error: ${validation.error}` },
            { status: 400 }
          );
        }

        const buffer = await file.arrayBuffer();
        const uploaded = await uploadFileToS3(
          Buffer.from(buffer),
          file.name,
          `projects/${courseId}/${projectName}/images`
        );
        images.push(uploaded);
      }
    }

    // Create project
    const project = new Project({
      courseId,
      lecturerId,
      projectName: projectName.trim(),
      description,
      projectType,
      assignedGroupIds: projectType === 'group' ? normalizedAssignedGroupIds : [],
      deadlineDate,
      deadlineTime,
      specialNotes,
      templateDocuments,
      otherDocuments,
      images,
      mainTasks, // Includes nested subtasks
    });

    await project.save();

    // Schedule deadline reminders immediately for assigned students.
    if ((project.isPublished ?? true) && deadlineDate) {
      try {
        let recipientStudentIds: string[] = [];

        if (projectType === 'group') {
          const groupsWithStudents = await CourseGroup.find({
            _id: { $in: normalizedAssignedGroupIds },
            courseId,
            isArchived: false,
          })
            .select('studentIds')
            .lean();

          recipientStudentIds = [
            ...new Set(
              (groupsWithStudents as GroupStudentsLite[]).flatMap((group) =>
                Array.isArray(group.studentIds)
                  ? group.studentIds.map((id) => String(id))
                  : []
              )
            ),
          ];
        } else {
          const courseAndStudents = await getEligibleStudentsForCourse(courseId);
          recipientStudentIds = ((courseAndStudents?.students || []) as EligibleStudentLite[]).map((student) =>
            student._id.toString()
          );
        }

        await Promise.all(
          recipientStudentIds.map((studentId) =>
            scheduleReminderJobsForStudentItem({
              studentId,
              itemType: 'project',
              itemId: project._id.toString(),
              itemName: project.projectName,
              deadlineDate: project.deadlineDate,
              deadlineTime: project.deadlineTime || '23:59',
              startAt: project.createdAt,
            })
          )
        );
      } catch (scheduleError) {
        console.error('Project reminder scheduling warning:', scheduleError);
      }
    }

    return NextResponse.json(
      {
        message: 'Project created successfully',
        data: project,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');
    const lecturerId = searchParams.get('lecturerId');

    // Validate required parameters
    if (!courseId) {
      return NextResponse.json(
        { message: 'Course ID is required' },
        { status: 400 }
      );
    }

    if (!lecturerId) {
      return NextResponse.json(
        { message: 'Lecturer ID is required' },
        { status: 400 }
      );
    }

    // Fetch projects filtered by courseId and lecturerId
    const projects = await Project.find({
      courseId: courseId,
      lecturerId: lecturerId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const allGroupIds = [
      ...new Set((projects as ProjectWithGroupsLite[]).flatMap((project) => project.assignedGroupIds || [])),
    ];
    const groups = allGroupIds.length
      ? await CourseGroup.find({
          _id: { $in: allGroupIds },
          isArchived: false,
        })
          .select('_id groupName')
          .lean()
      : [];
    const normalizedGroups = (groups as GroupLite[]).map((group) => ({
      _id: group._id.toString(),
      groupName: String(group.groupName || ''),
    }));
    const groupById = new Map(normalizedGroups.map((group) => [group._id, group]));

    // Enrich with course data
    const courseDoc = await Course.findById(courseId)
      .select('_id courseName courseCode')
      .lean();

    const projectsWithGroups = (projects as ProjectWithGroupsLite[]).map((project) => ({
      ...project,
      assignedGroups: (project.assignedGroupIds || [])
        .map((groupId: string) => groupById.get(groupId))
        .filter(Boolean),
      course: courseDoc || undefined,
    }));

    return NextResponse.json(
      {
        message: 'Projects fetched successfully',
        data: {
          projects: projectsWithGroups || [],
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Fetch projects error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
