import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Prediction from '@/model/Prediction';
import Student from '@/model/Student';
import { successResponse, notFoundResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';

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
      return unauthorizedResponse('Unauthorized');
    }

    const student = await Student.findById(payload.userId)
      .select('_id name email studentIdNumber')
      .lean();

    if (!student) {
      return notFoundResponse('Student not found');
    }

    // Use studentIdNumber as the stable lookup because seeded demo data may
    // contain a mix of string and ObjectId values in the studentId field.
    const prediction = await Prediction.findOne({ studentIdNumber: student.studentIdNumber })
      .sort({ createdAt: -1 })
      .lean();

    if (!prediction) {
      return notFoundResponse('No predictions found for this student');
    }

    return successResponse('Latest prediction retrieved successfully', {
      prediction: {
        ...prediction,
        studentId: {
          _id: student._id,
          name: student.name,
          email: student.email,
          studentIdNumber: student.studentIdNumber,
        },
      },
    }, 200);
  } catch (error: any) {
    console.error('Get latest prediction error:', error);
    return serverErrorResponse('An error occurred while fetching latest prediction');
  }
}
