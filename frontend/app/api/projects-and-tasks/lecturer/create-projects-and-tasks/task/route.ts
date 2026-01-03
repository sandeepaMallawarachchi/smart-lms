// /app/api/projects-and-tasks/lecturer/create-projects-and-tasks/task/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import {connectDB} from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validation
    const { courseId, lecturerId, taskName } = body;

    if (!courseId) {
      return NextResponse.json(
        { message: 'Course ID is required' },
        { status: 400 }
      );
    }

    if (!taskName || !taskName.trim()) {
      return NextResponse.json(
        { message: 'Task name is required' },
        { status: 400 }
      );
    }

    // Create task
    const task = new Task({
      courseId,
      lecturerId,
      taskName: taskName.trim(),
      description: body.description || { html: '', text: '' },
      deadlineDate: body.deadlineDate || '',
      deadlineTime: body.deadlineTime || '23:59',
      specialNotes: body.specialNotes || { html: '', text: '' },
      templateDocuments: body.templateDocuments || [],
      otherDocuments: body.otherDocuments || [],
      images: body.images || [],
      subtasks: body.subtasks || [],
    });

    await task.save();

    return NextResponse.json(
      {
        message: 'Task created successfully',
        data: task,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}