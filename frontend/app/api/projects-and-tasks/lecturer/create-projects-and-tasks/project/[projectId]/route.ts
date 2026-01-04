// /app/api/projects-and-tasks/lecturer/create-projects-and-tasks/project/[projectId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Project } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { connectDB } from '@/lib/db';

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

    const project = await Project.findById(projectId);

    if (!project) {
      return NextResponse.json(
        { message: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Project fetched successfully',
        data: project,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Fetch project error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch project' },
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

    const body = await request.json();
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

    console.log('All validations passed, updating project...');

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        projectName: body.projectName.trim(),
        description: body.description || { html: '', text: '' },
        projectType: body.projectType,
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

    console.log('Project updated successfully');

    return NextResponse.json(
      {
        message: 'Project updated successfully',
        data: updatedProject,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update project' },
      { status: 500 }
    );
  }
}