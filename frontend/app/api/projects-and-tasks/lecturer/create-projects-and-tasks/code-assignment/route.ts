import { connectDB } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

import { CodeAssignment } from "@/model/projects-and-tasks/lecturer/CodeAssignement" 

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()

    const {
      courseId,
      lecturerId,
      question,
      type,
      language,
      deadlineDate,
      deadlineTime,
      options,
      testCases
    } = body

    if (!courseId || !lecturerId) {
      return NextResponse.json(
        { message: 'Course ID and Lecturer ID are required' },
        { status: 400 }
      )
    }

    if (!question || !question.trim()) {
      return NextResponse.json(
        { message: 'Question description is required' },
        { status: 400 }
      )
    }

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return NextResponse.json(
        { message: 'At least one test case is required' },
        { status: 400 }
      )
    }

    if (!deadlineDate || !deadlineTime) {
      return NextResponse.json(
        { message: 'Deadline date and time are required' },
        { status: 400 }
      )
    }

    const newAssignment = new CodeAssignment({
      courseId,
      lecturerId,
      projectType: 'code', 
      language,
      question,
      deadlineDate,
      deadlineTime,
      options,
      testCases
    })

    await newAssignment.save()

    return NextResponse.json(
      {
        message: 'Code assignment created successfully',
        data: newAssignment,
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Create code assignment error:', error)
    return NextResponse.json(
      { message: error.message || 'Failed to create code assignment' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')
    const lecturerId = searchParams.get('lecturerId')

    if (!courseId) {
      return NextResponse.json(
        { message: 'Course ID is required' },
        { status: 400 }
      )
    }

    const assignments = await CodeAssignment.find({
      courseId: courseId,
      projectType: 'code',
      ...(lecturerId && { lecturerId }) 
    })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(
      {
        message: 'Assignments fetched successfully',
        data: {
          assignments: assignments || [],
        },
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('Fetch assignments error:', error)
    return NextResponse.json(
      { message: error.message || 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}