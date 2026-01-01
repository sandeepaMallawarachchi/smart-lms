import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
import Lecturer from '@/model/Lecturer';
import { generateToken } from '@/lib/jwt';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const { email, password } = body;

    // Validation
    const errors: Record<string, string[]> = {};

    if (!email) errors.email = ['Email is required'];
    if (!password) errors.password = ['Password is required'];

    if (Object.keys(errors).length > 0) {
      return errorResponse('Validation failed', errors, 400);
    }

    // Check if credentials match superadmin
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (email === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Generate token for superadmin
      const token = generateToken({
        userId: 'superadmin',
        email: ADMIN_USERNAME as string,
        userRole: 'superadmin',
      });

      return successResponse('Login successful', {
        user: {
          email: ADMIN_USERNAME,
          role: 'superadmin',
          name: 'Super Admin',
        },
        token,
        userRole: 'superadmin',
        isSuperAdmin: true,
      }, 200);
    }

    // Try to find student first
    let user = await Student.findOne({ email: email.toLowerCase() }).select('+password');
    let userRole: 'student' | 'lecture' = 'student';

    // If student not found, try lecturer
    if (!user) {
      user = await Lecturer.findOne({ email: email.toLowerCase() }).select('+password');
      userRole = 'lecture';
    }

    // User not found
    if (!user) {
      return errorResponse('Invalid credentials', {
        email: ['Email or password is incorrect'],
      }, 401);
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return errorResponse('Invalid credentials', {
        password: ['Email or password is incorrect'],
      }, 401);
    }

    if (!user.isVerified) {
      return errorResponse('Account pending approval', {
        email: ['Your account is pending admin approval'],
      }, 403);
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      userRole,
    });

    // Remove password from response
    const userData = user.toObject();
    delete userData.password;

    return successResponse('Login successful', {
      user: userData,
      token,
      userRole,
      isSuperAdmin: false,
    }, 200);
  } catch (error: any) {
    console.error('Login error:', error);
    return serverErrorResponse('An error occurred during login');
  }
}