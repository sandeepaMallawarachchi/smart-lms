import { NextRequest, NextResponse } from 'next/server';
import { Project } from '@/model/projects-and-tasks/lecturer/projectTaskModel';
import { connectDB } from '@/lib/db';
import CourseGroup from '@/model/CourseGroup';
import Course from '@/model/Course';

type ProjectWithGroupsLite = { assignedGroupIds?: string[] } & Record<string, unknown>;
type GroupLite = { _id: { toString(): string } } & Record<string, unknown>;

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

    const projects = await Project.find({
      courseId,
      lecturerId,
      isPublished: { $ne: false },
      isArchived: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .lean();

    const allGroupIds = [
      ...new Set((projects as ProjectWithGroupsLite[]).flatMap((p) => p.assignedGroupIds || [])),
    ];
    const groups = allGroupIds.length
      ? await CourseGroup.find({ _id: { $in: allGroupIds }, isArchived: false })
          .select('_id groupName')
          .lean()
      : [];
    const normalizedGroups = (groups as GroupLite[]).map((g) => ({
      _id: g._id.toString(),
      groupName: String((g as Record<string, unknown>).groupName || ''),
    }));
    const groupById = new Map(normalizedGroups.map((g) => [g._id, g]));

    const courseDoc = await Course.findById(courseId)
      .select('_id courseName courseCode')
      .lean();

    const projectsWithGroups = (projects as ProjectWithGroupsLite[]).map((project) => ({
      ...project,
      assignedGroups: (project.assignedGroupIds || [])
        .map((groupId: string) => groupById.get(groupId))
        .filter(Boolean),
      course: courseDoc || undefined,
    }));

    return NextResponse.json(
      {
        message: 'Published projects fetched successfully',
        data: { projects: projectsWithGroups },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Fetch published projects error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch published projects' },
      { status: 500 }
    );
  }
}
