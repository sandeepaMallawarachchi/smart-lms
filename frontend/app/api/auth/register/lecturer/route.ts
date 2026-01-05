// app/api/auth/register/lecturer/route.ts

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Lecturer from '@/model/Lecturer';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const { name, email, password, confirmPassword, gender, dateOfBirth, position } = body;

    // Validation
    const errors: Record<string, string[]> = {};

    if (!name || name.trim().length < 2) {
      errors.name = ['Name must be at least 2 characters'];
    }

    if (!email) {
      errors.email = ['Email is required'];
    } else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      errors.email = ['Please provide a valid email'];
    }

    if (!password) {
      errors.password = ['Password is required'];
    } else if (password.length < 6) {
      errors.password = ['Password must be at least 6 characters'];
    }

    if (!confirmPassword) {
      errors.confirmPassword = ['Password confirmation is required'];
    } else if (password && confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = ['Passwords do not match'];
    }

    if (!gender) {
      errors.gender = ['Gender is required'];
    }

    if (!dateOfBirth) {
      errors.dateOfBirth = ['Date of birth is required'];
    }

    if (!position) {
      errors.position = ['Position is required'];
    } else if (!['lecture', 'instructure', 'lic'].includes(position)) {
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
      return errorResponse('Registration failed', {
        email: ['This email is already registered'],
      }, 400);
    }

    // Create new lecturer
    const lecturer = new Lecturer({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      gender,
      dateOfBirth: new Date(dateOfBirth),
      position,
      userRole: 'lecture',
      isVerified: true,
    });

    await lecturer.save();

    // Remove password from response
    const lecturerData = lecturer.toObject();
    delete lecturerData.password;

    return successResponse('Lecturer registered successfully and verified', {
      lecturer: lecturerData,
    }, 201);
  } catch (error: any) {
    console.error('Lecturer registration error:', error);

    if (error.code === 11000) {
      return errorResponse('Registration failed', {
        email: ['This email is already registered'],
      }, 400);
    }

    if (error.name === 'ValidationError') {
      const validationErrors: Record<string, string[]> = {};
      Object.keys(error.errors).forEach((key) => {
        validationErrors[key] = [error.errors[key].message];
      });
      return errorResponse('Validation failed', validationErrors, 400);
    }

    return serverErrorResponse('An error occurred during registration');
  }
}