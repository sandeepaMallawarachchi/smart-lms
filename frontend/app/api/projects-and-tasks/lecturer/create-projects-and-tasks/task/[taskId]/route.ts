// /app/api/projects-and-tasks/lecturer/create-projects-and-tasks/task/[taskId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Task, StudentTaskProgress } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { connectDB } from '@/lib/db';
import { scheduleReminderJobsForStudentItem, cancelReminderJobsForStudentItem } from '@/lib/projects-and-tasks/reminders/scheduler';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ taskId: string }> }
) {
  try {
    await connectDB();

    const { taskId } = await props.params;

    if (!taskId) {
      return NextResponse.json(
        { message: 'Task ID is required' },
        { status: 400 }
      );
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Task fetched successfully',
        data: task,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Fetch task error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ taskId: string }> }
) {
  try {
    await connectDB();

    // ✅ IMPORTANT: Await params in Next.js 15+
    const { taskId } = await props.params;
    
    console.log('=== PUT Request ===');
    console.log('taskId from params:', taskId);
    
    // Validate taskId from URL params
    if (!taskId) {
      console.error('Missing taskId in URL params');
      return NextResponse.json(
        { message: 'Task ID is required' },
        { status: 400 }
      );
    }

    const existingTask = await Task.findById(taskId).lean();
    if (!existingTask) {
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      taskName?: string;
      description?: { html: string; text: string };
      deadlineDate?: string;
      deadlineTime?: string;
      specialNotes?: { html: string; text: string };
      isPublished?: boolean;
    };
    console.log('Request body:', body);

    // Validate required fields
    if (!body.taskName?.trim()) {
      return NextResponse.json(
        { message: 'Task name is required' },
        { status: 400 }
      );
    }

    console.log('All validations passed, updating task...');

    // Update task
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        taskName: body.taskName.trim(),
        description: body.description || { html: '', text: '' },
        deadlineDate: body.deadlineDate || '',
        deadlineTime: body.deadlineTime || '23:59',
        specialNotes: body.specialNotes || { html: '', text: '' },
        isPublished: typeof body.isPublished === 'boolean' ? body.isPublished : existingTask.isPublished ?? true,
      },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      console.error('Task not found for ID:', taskId);
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      );
    }

    const deadlineChanged =
      (existingTask.deadlineDate || '') !== (updatedTask.deadlineDate || '') ||
      (existingTask.deadlineTime || '23:59') !== (updatedTask.deadlineTime || '23:59');
    const nameChanged = existingTask.taskName !== updatedTask.taskName;
    const publishStateChanged = (existingTask.isPublished ?? true) !== (updatedTask.isPublished ?? true);
    const shouldRescheduleReminders = deadlineChanged || nameChanged || publishStateChanged;

    if (shouldRescheduleReminders) {
      const activeProgress = await StudentTaskProgress.find({
        taskId,
        status: 'inprogress',
      })
        .select('studentId')
        .lean();

      if (updatedTask.isPublished && updatedTask.deadlineDate) {
        await Promise.all(
          activeProgress.map((row: { studentId: string }) =>
            scheduleReminderJobsForStudentItem({
              studentId: row.studentId,
              itemType: 'task',
              itemId: taskId,
              itemName: updatedTask.taskName,
              deadlineDate: updatedTask.deadlineDate,
              deadlineTime: updatedTask.deadlineTime || '23:59',
            })
          )
        );
      } else {
        await Promise.all(
          activeProgress.map((row: { studentId: string }) =>
            cancelReminderJobsForStudentItem({
              studentId: row.studentId,
              taskId,
            })
          )
        );
      }
    }

    console.log('Task updated successfully');

    return NextResponse.json(
      {
        message: 'Task updated successfully',
        data: updatedTask,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}
