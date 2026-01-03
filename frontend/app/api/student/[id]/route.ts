import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return notFoundResponse('Invalid student ID format');
    }

    // Find student by ID
    const student = await Student.findById(id)
      .select('studentIdNumber name email gender dateOfBirth address nicNumber userRole academicYear semester specialization isVerified createdAt updatedAt')
      .lean();

    if (!student) {
      return notFoundResponse('Student not found');
    }

    return successResponse('Student retrieved successfully', { student }, 200);
  } catch (error: any) {
    console.error('Get student by ID error:', error);
    return serverErrorResponse('An error occurred while fetching student details');
  }
}