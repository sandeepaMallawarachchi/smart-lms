import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { CodeAssignment } from '@/model/projects-and-tasks/lecturer/CodeAssignement';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ codeId: string }> }
) {
  try {
    await connectDB();
    const { codeId } = await props.params;

    if (!codeId) {
      return NextResponse.json({ message: 'Code assignment ID is required' }, { status: 400 });
    }

    const assignment = await CodeAssignment.findById(codeId);

    if (!assignment) {
      return NextResponse.json({ message: 'Code assignment not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: 'Code assignment fetched successfully',
        data: assignment,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Fetch code assignment error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch code assignment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ codeId: string }> }
) {
  try {
    await connectDB();
    const { codeId } = await props.params;

    if (!codeId) {
      return NextResponse.json({ message: 'Code assignment ID is required' }, { status: 400 });
    }

    const body = await request.json();

    const updatedAssignment = await CodeAssignment.findByIdAndUpdate(
      codeId,
      {
        question: body.question,
        language: body.language,
        deadlineDate: body.deadlineDate,
        deadlineTime: body.deadlineTime,
        options: body.options,
        testCases: body.testCases,
      },
      { new: true, runValidators: true }
    );

    if (!updatedAssignment) {
      return NextResponse.json({ message: 'Code assignment not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: 'Code assignment updated successfully',
        data: updatedAssignment,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update code assignment error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update code assignment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ codeId: string }> }
) {
  try {
    await connectDB();
    const { codeId } = await props.params;

    if (!codeId) {
      return NextResponse.json({ message: 'Code assignment ID is required' }, { status: 400 });
    }

    const deletedAssignment = await CodeAssignment.findByIdAndDelete(codeId);

    if (!deletedAssignment) {
      return NextResponse.json({ message: 'Code assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Code assignment deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Delete code assignment error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to delete code assignment' },
      { status: 500 }
    );
  }
}
