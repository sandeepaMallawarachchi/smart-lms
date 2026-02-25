// /app/api/projects-and-tasks/lecturer/create-projects-and-tasks/project/[projectId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Project, StudentProjectProgress } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { connectDB } from '@/lib/db';
import { scheduleReminderJobsForStudentItem } from '@/lib/projects-and-tasks/reminders/scheduler';
import CourseGroup from '@/model/CourseGroup';

type ProjectWithGroupsLite = {
  courseId: string;
  deadlineDate: string;
  deadlineTime?: string;
  projectName: string;
  assignedGroupIds?: string[];
} & Record<string, unknown>;

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

    return NextResponse.json(
      {
        message: 'Project fetched successfully',
        data: {
          ...project,
          assignedGroups,
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

    if (shouldRescheduleReminders) {
      const activeProgress = await StudentProjectProgress.find({
        projectId,
        status: 'inprogress',
      })
        .select('studentId')
        .lean();

      await Promise.all(
        activeProgress.map((row: { studentId: string }) =>
          scheduleReminderJobsForStudentItem({
            studentId: row.studentId,
            itemType: 'project',
            itemId: projectId,
            itemName: updatedProject.projectName,
            deadlineDate: updatedProject.deadlineDate,
            deadlineTime: updatedProject.deadlineTime || '23:59',
          })
        )
      );
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
