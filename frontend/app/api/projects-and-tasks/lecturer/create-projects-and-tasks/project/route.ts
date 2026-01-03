// /app/api/projects-and-tasks/lecturer/create-projects-and-tasks/project/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Project } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { connectDB } from '@/lib/db';
import { uploadFileToS3, validateFile } from '@/lib/s3-upload';

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
    const mainTasks = JSON.parse((formData.get('mainTasks') as string) || '[]');

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
      deadlineDate,
      deadlineTime,
      specialNotes,
      templateDocuments,
      otherDocuments,
      images,
      mainTasks, // Includes nested subtasks
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

    return NextResponse.json(
      {
        message: 'Projects fetched successfully',
        data: {
          projects: projects || [],
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Fetch projects error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}