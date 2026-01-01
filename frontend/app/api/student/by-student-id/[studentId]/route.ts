import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    await connectDB();

    const { studentId } = params;

    // Find student by student ID number
    const student = await Student.findOne({ studentIdNumber: studentId.toLowerCase() })
      .select('studentIdNumber name email gender dateOfBirth address nicNumber userRole academicYear semester specialization isVerified createdAt updatedAt')
      .lean();

    if (!student) {
      return notFoundResponse('Student not found');
    }

    return successResponse('Student retrieved successfully', { student }, 200);
  } catch (error: any) {
    console.error('Get student by student ID error:', error);
    return serverErrorResponse('An error occurred while fetching student details');
  }
}