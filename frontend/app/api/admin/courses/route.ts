// /api/admin/courses/route.ts

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Course from '@/model/Course';
import { verifyToken } from '@/lib/jwt';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload || payload.userRole !== 'superadmin') {
      return unauthorizedResponse('Unauthorized access');
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');

    let query: any = {};

    if (filter === 'archived') {
      query.isArchived = true;
    } else if (filter === 'active') {
      query.isArchived = false;
    }

    const courses = await Course.find(query)
      .populate('lecturerInCharge', 'name email position')
      .populate('lecturers', 'name email position')
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      total: await Course.countDocuments(),
      active: await Course.countDocuments({ isArchived: false }),
      archived: await Course.countDocuments({ isArchived: true }),
    };

    return successResponse('Courses retrieved successfully', {
      courses,
      stats,
    }, 200);
  } catch (error: any) {
    console.error('Get courses error:', error);
    return serverErrorResponse('An error occurred while fetching courses');
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload || payload.userRole !== 'superadmin') {
      return unauthorizedResponse('Unauthorized access');
    }

    const body = await request.json();
    const { courseName, credits, year, semester, lecturerInCharge, lecturers } = body;

    // Validation
    const errors: any = {};
    if (!courseName) errors.courseName = ['Course name is required'];
    if (!credits || credits < 1 || credits > 10) errors.credits = ['Credits must be between 1 and 10'];
    if (!year || year < 1 || year > 4) errors.year = ['Year must be between 1 and 4'];
    if (!semester || ![1, 2].includes(semester)) errors.semester = ['Semester must be 1 or 2'];
    if (!lecturerInCharge) errors.lecturerInCharge = ['Lecturer in charge is required'];

    if (Object.keys(errors).length > 0) {
      return Response.json({
        success: false,
        message: 'Validation failed',
        errors,
      }, { status: 400 });
    }

    // LIC is included in lecturers array
    const allLecturers = lecturers || [];
    if (!allLecturers.includes(lecturerInCharge)) {
      allLecturers.push(lecturerInCharge);
    }

    const course = await Course.create({
      courseName,
      credits,
      year,
      semester,
      lecturerInCharge,
      lecturers: allLecturers,
    });

    const populatedCourse = await Course.findById(course._id)
      .populate('lecturerInCharge', 'name email position')
      .populate('lecturers', 'name email position');

    return successResponse('Course created successfully', { course: populatedCourse }, 201);
  } catch (error: any) {
    console.error('Create course error:', error);
    return serverErrorResponse('An error occurred while creating the course');
  }
}