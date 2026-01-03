// /app/api/projects-and-tasks/lecturer/create-projects-and-tasks/project/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Project } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import {connectDB} from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validation
    const { courseId, lecturerId, projectName, projectType, deadlineDate } = body;

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

    // Create project
    const project = new Project({
      courseId,
      lecturerId,
      projectName: projectName.trim(),
      description: body.description || { html: '', text: '' },
      projectType,
      deadlineDate,
      deadlineTime: body.deadlineTime || '23:59',
      specialNotes: body.specialNotes || { html: '', text: '' },
      templateDocuments: body.templateDocuments || [],
      otherDocuments: body.otherDocuments || [],
      images: body.images || [],
      mainTasks: body.mainTasks || [],
    });

    await project.save();

    return NextResponse.json(
      {
        message: 'Project created successfully',
        data: project,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}