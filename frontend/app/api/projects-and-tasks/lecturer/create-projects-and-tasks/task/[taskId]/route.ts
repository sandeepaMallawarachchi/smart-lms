// /app/api/projects-and-tasks/lecturer/create-projects-and-tasks/task/[taskId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Task, StudentTaskProgress } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { connectDB } from '@/lib/db';
import { scheduleReminderJobsForStudentItem, cancelReminderJobsForStudentItem } from '@/lib/projects-and-tasks/reminders/scheduler';

type IncomingSubtask = { id?: string; title?: string; description?: string; marks?: number | string };

function normalizeTaskSubtasks(subtasks: unknown): { ok: true; value: IncomingSubtask[] } | { ok: false; message: string } {
  if (!Array.isArray(subtasks)) {
    return { ok: false, message: 'Subtasks must be an array' };
  }

  let totalMarks = 0;
  const normalized: IncomingSubtask[] = [];

  for (const rawSubtask of subtasks) {
    const subtask = (rawSubtask || {}) as IncomingSubtask;
    const marks = Number(subtask.marks ?? 0);
    if (!Number.isFinite(marks) || marks < 0 || marks > 100) {
      return { ok: false, message: 'Each subtask mark must be between 0 and 100' };
    }
    totalMarks += marks;
    if (totalMarks > 100) {
      return { ok: false, message: 'Total subtask marks cannot exceed 100' };
    }

    normalized.push({
      id: String(subtask.id || ''),
      title: String(subtask.title || ''),
      description: String(subtask.description || ''),
      marks,
    });
  }

  return { ok: true, value: normalized };
}

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
  } catch (error: unknown) {
    console.error('Fetch task error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch task' },
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
      subtasks?: IncomingSubtask[];
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

    const subtasksSource = body.subtasks ?? existingTask.subtasks ?? [];
    const normalizedSubtasksResult = normalizeTaskSubtasks(subtasksSource);
    if (!normalizedSubtasksResult.ok) {
      return NextResponse.json(
        { message: normalizedSubtasksResult.message },
        { status: 400 }
      );
    }
    const normalizedSubtasks = normalizedSubtasksResult.value;

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
        subtasks: normalizedSubtasks,
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
        status: { $ne: 'done' },
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
  } catch (error: unknown) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    );
  }
}
