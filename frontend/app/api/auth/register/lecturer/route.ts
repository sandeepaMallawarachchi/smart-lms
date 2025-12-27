import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Lecturer from '@/model/projects-and-tasks/Lecturer';
import { generateToken } from '@/lib/jwt';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const { name, email, password, passwordConfirmation, gender, dateOfBirth, position } = body;

    // Validation
    const errors: Record<string, string[]> = {};

    if (!name) errors.name = ['Name is required'];
    if (!email) errors.email = ['Email is required'];
    if (!password) errors.password = ['Password is required'];
    if (!passwordConfirmation) errors.passwordConfirmation = ['Password confirmation is required'];
    if (password && passwordConfirmation && password !== passwordConfirmation) {
      errors.passwordConfirmation = ['Passwords do not match'];
    }
    if (!gender) errors.gender = ['Gender is required'];
    if (!dateOfBirth) errors.dateOfBirth = ['Date of birth is required'];
    if (!position) errors.position = ['Position is required'];
    if (position && !['lecture', 'instructure', 'lic'].includes(position)) {
      errors.position = ['Invalid position. Must be lecture, instructure, or lic'];
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse('Validation failed', errors, 400);
    }

    // Check if lecturer already exists
    const existingLecturer = await Lecturer.findOne({
      email: email.toLowerCase(),
    });

    if (existingLecturer) {
      errors.email = ['Email is already registered'];
      return errorResponse('Registration failed', errors, 400);
    }

    // Create new lecturer
    const lecturer = new Lecturer({
      name,
      email: email.toLowerCase(),
      password,
      gender,
      dateOfBirth: new Date(dateOfBirth),
      position,
    });

    await lecturer.save();

    // Generate JWT token
    const token = generateToken({
      userId: lecturer._id.toString(),
      email: lecturer.email,
      userRole: 'lecture',
    });

    // Remove password from response
    const lecturerData = lecturer.toObject();
    delete lecturerData.password;

    return successResponse('Lecturer registered successfully', {
      lecturer: lecturerData,
      token,
    }, 201);
  } catch (error: any) {
    console.error('Lecturer registration error:', error);

    if (error.code === 11000) {
      return errorResponse('Registration failed', {
        email: ['This email is already registered'],
      }, 400);
    }

    return serverErrorResponse('An error occurred during registration');
  }
}