// /app/api/projects-and-tasks/lecturer/templates/project/route.ts

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/projects-and-tasks/db';
import ProjectTemplate from '@/model/projects-and-tasks/lecturer/ProjectTemplate';
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
      projectName,
      description,
      specialNotes,
      notifications,
      images,
      documents,
      deadlineDate,
      deadlineTime,
      markingDescription,
      totalMarks,
      mainTasks,
      isSingleTaskTemplate,
      subtasks,
    } = body;

    // Validation
    const errors: Record<string, string[]> = {};

    if (!course) {
      errors.course = ['Course is required'];
    }

    if (!projectName || projectName.trim().length === 0) {
      errors.projectName = ['Project name is required'];
    } else if (projectName.trim().length > 200) {
      errors.projectName = ['Project name must be less than 200 characters'];
    }

    if (!deadlineDate) {
      errors.deadlineDate = ['Deadline date is required'];
    }

    // Validate tasks based on template type
    if (!isSingleTaskTemplate) {
      if (!mainTasks || !Array.isArray(mainTasks) || mainTasks.length === 0) {
        errors.mainTasks = ['At least one main task is required for project templates'];
      } else {
        // Validate main tasks structure
        mainTasks.forEach((task: any, index: number) => {
          if (!task.title || task.title.trim().length === 0) {
            errors[`mainTasks[${index}].title`] = ['Task title is required'];
          }
        });
      }
    } else {
      // Single task template
      if (!subtasks || !Array.isArray(subtasks) || subtasks.length === 0) {
        errors.subtasks = ['At least one subtask is required for single task templates'];
      } else {
        subtasks.forEach((st: any, index: number) => {
          if (!st.title || st.title.trim().length === 0) {
            errors[`subtasks[${index}].title`] = ['Subtask title is required'];
          }
        });
      }
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse('Validation failed', errors, 400);
    }

    // Create template
    const template = await ProjectTemplate.create({
      course,
      lecturer: payload.userId,
      projectName: projectName.trim(),
      description,
      specialNotes,
      notifications: notifications || [],
      images: images || [],
      documents: documents || [],
      deadlineDate: new Date(deadlineDate),
      deadlineTime: deadlineTime || '23:59',
      markingDescription,
      totalMarks,
      mainTasks: !isSingleTaskTemplate ? mainTasks : [],
      isSingleTaskTemplate,
      subtasks: isSingleTaskTemplate ? subtasks : [],
      isActive: true,
    });

    // Populate references
    await template.populate('course', 'courseName courseCode year semester');
    await template.populate('lecturer', 'name email');

    return successResponse('Project template created successfully', {
      template: template.toObject(),
    }, 201);
  } catch (error: any) {
    console.error('Create project template error:', error);
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

    const templates = await ProjectTemplate.find(query)
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