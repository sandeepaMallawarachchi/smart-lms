import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
import Course from '@/model/Course';
import { Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { successResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload || payload.userRole !== 'student') {
      return unauthorizedResponse('Unauthorized access - Only students can access this endpoint');
    }

    // Get student details
    const student = await Student.findById(payload.userId);

    if (!student) {
      return notFoundResponse('Student not found');
    }

    const assignedCourses = await Course.find({
      year: parseInt(student.academicYear),
      semester: parseInt(student.semester),
      specializations: student.specialization,
      isArchived: false,
    })
      .select('_id courseName courseCode')
      .lean();

    if (assignedCourses.length === 0) {
      return successResponse('No courses assigned to this student', {
        student: {
          id: student._id,
          name: student.name,
          studentIdNumber: student.studentIdNumber,
          academicYear: student.academicYear,
          semester: student.semester,
          specialization: student.specialization,
        },
        courses: [],
        tasks: [],
        totalTasks: 0,
      }, 200);
    }

    //Get the course IDs
    const courseIds = assignedCourses.map(course => course._id.toString());

    // Find all tasks for these courses
    const tasks = await Task.find({
      courseId: { $in: courseIds },
      isArchived: { $ne: true },
    })
      .populate('lecturerId', 'name email position')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich tasks with course information
    const courseMap = new Map(
      assignedCourses.map(course => [course._id.toString(), course])
    );

    const enrichedTasks = tasks.map(task => ({
      ...task,
      course: courseMap.get(task.courseId.toString()),
    }));

    return successResponse('Tasks retrieved successfully', {
      student: {
        id: student._id,
        name: student.name,
        studentIdNumber: student.studentIdNumber,
        academicYear: student.academicYear,
        semester: student.semester,
        specialization: student.specialization,
      },
      courses: assignedCourses,
      tasks: enrichedTasks,
      totalCourses: assignedCourses.length,
      totalTasks: enrichedTasks.length,
    }, 200);
  } catch (error: any) {
    console.error('Get student tasks error:', error);
    return serverErrorResponse('An error occurred while fetching tasks');
  }
}