// /app/api/projects-and-tasks/lecturer/templates/task/route.ts

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/projects-and-tasks/db';
import TaskTemplate from '@/model/projects-and-tasks/lecturer/TaskTemplate';
import Lecturer from '@/model/projects-and-tasks/Lecturer';
import { verifyToken } from '@/lib/projects-and-tasks/jwt';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  errorResponse,
} from '@/lib/projects-and-tasks/api-response';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Only lecturers can create templates');
    }

    // Get lecturer
    const lecturer = await Lecturer.findById(payload.userId);
    if (!lecturer) {
      return unauthorizedResponse('Lecturer not found');
    }

    const body = await request.json();
    const {
      course,
      taskName,
      description,
      specialNotes,
      notifications,
      images,
      documents,
      deadlineDate,
      deadlineTime,
      markingDescription,
      totalMarks,
      subtasks,
    } = body;

    // Validation
    const errors: Record<string, string[]> = {};

    if (!course) {
      errors.course = ['Course is required'];
    }

    if (!taskName || taskName.trim().length === 0) {
      errors.taskName = ['Task name is required'];
    } else if (taskName.trim().length > 200) {
      errors.taskName = ['Task name must be less than 200 characters'];
    }

    if (!deadlineDate) {
      errors.deadlineDate = ['Deadline date is required'];
    }

    if (!subtasks || !Array.isArray(subtasks) || subtasks.length === 0) {
      errors.subtasks = ['At least one subtask is required'];
    } else {
      subtasks.forEach((st: any, index: number) => {
        if (!st.title || st.title.trim().length === 0) {
          errors[`subtasks[${index}].title`] = ['Subtask title is required'];
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse('Validation failed', errors, 400);
    }

    // Create template
    const template = await TaskTemplate.create({
      course,
      lecturer: payload.userId,
      taskName: taskName.trim(),
      description,
      specialNotes,
      notifications: notifications || [],
      images: images || [],
      documents: documents || [],
      deadlineDate: new Date(deadlineDate),
      deadlineTime: deadlineTime || '23:59',
      markingDescription,
      totalMarks,
      subtasks,
      isActive: true,
    });

    // Populate references
    await template.populate('course', 'courseName courseCode year semester');
    await template.populate('lecturer', 'name email');

    return successResponse('Task template created successfully', {
      template: template.toObject(),
    }, 201);
  } catch (error: any) {
    console.error('Create task template error:', error);
    return serverErrorResponse('An error occurred while creating the template');
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Only lecturers can view templates');
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course');

    let query: any = {
      lecturer: payload.userId,
      isActive: true,
    };

    if (courseId) {
      query.course = courseId;
    }

    const templates = await TaskTemplate.find(query)
      .populate('course', 'courseName courseCode year semester')
      .populate('lecturer', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse('Templates retrieved successfully', {
      templates,
      count: templates.length,
    }, 200);
  } catch (error: any) {
    console.error('Get templates error:', error);
    return serverErrorResponse('An error occurred while fetching templates');
  }
}