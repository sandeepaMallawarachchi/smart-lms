import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get query parameters for filtering (optional)
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');
    const specialization = searchParams.get('specialization');
    const isVerified = searchParams.get('isVerified');

    // Build filter object
    const filter: any = {};
    
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;
    if (specialization) filter.specialization = specialization;
    if (isVerified !== null && isVerified !== undefined) {
      filter.isVerified = isVerified === 'true';
    }

    // Fetch all students with selected fields
    const students = await Student.find(filter)
      .select('studentIdNumber name email gender dateOfBirth address nicNumber academicYear semester specialization isVerified createdAt')
      .sort({ name: 1 })
      .lean();

    return successResponse(
      'Students retrieved successfully', 
      { 
        students,
        total: students.length 
      }, 
      200
    );
  } catch (error: any) {
    console.error('Get students error:', error);
    return serverErrorResponse('An error occurred while fetching students');
  }
}