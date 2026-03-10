import { NextRequest, NextResponse } from 'next/server';
import { Task } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { connectDB } from '@/lib/db';
import Course from '@/model/Course';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');
    const lecturerId = searchParams.get('lecturerId');

    if (!courseId) {
      return NextResponse.json({ message: 'Course ID is required' }, { status: 400 });
    }
    if (!lecturerId) {
      return NextResponse.json({ message: 'Lecturer ID is required' }, { status: 400 });
    }

    const tasks = await Task.find({
      courseId,
      lecturerId,
      isPublished: { $ne: false },
      isArchived: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .lean();

    const courseDoc = await Course.findById(courseId)
      .select('_id courseName courseCode')
      .lean();

    const enrichedTasks = (tasks || []).map((task) => ({
      ...task,
      course: courseDoc || undefined,
    }));

    return NextResponse.json(
      {
        message: 'Published tasks fetched successfully',
        data: { tasks: enrichedTasks },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Fetch published tasks error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch published tasks' },
      { status: 500 }
    );
  }
}
