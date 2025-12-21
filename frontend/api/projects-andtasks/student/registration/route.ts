import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/projects-and-tasks/Student';
import { generateToken } from '@/lib/jwt';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const { studentIdNumber, name, email, password, passwordConfirmation, gender, dateOfBirth, address, nicNumber } =
      body;

    // Validation
    const errors: Record<string, string[]> = {};

    if (!studentIdNumber) errors.studentIdNumber = ['Student ID number is required'];
    if (!name) errors.name = ['Name is required'];
    if (!email) errors.email = ['Email is required'];
    if (!password) errors.password = ['Password is required'];
    if (!passwordConfirmation) errors.passwordConfirmation = ['Password confirmation is required'];
    if (password && passwordConfirmation && password !== passwordConfirmation) {
      errors.passwordConfirmation = ['Passwords do not match'];
    }
    if (!gender) errors.gender = ['Gender is required'];
    if (!dateOfBirth) errors.dateOfBirth = ['Date of birth is required'];
    if (!address) errors.address = ['Address is required'];
    if (!nicNumber) errors.nicNumber = ['NIC number is required'];

    if (Object.keys(errors).length > 0) {
      return errorResponse('Validation failed', errors, 400);
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [{ email: email.toLowerCase() }, { studentIdNumber }, { nicNumber }],
    });

    if (existingStudent) {
      if (existingStudent.email === email.toLowerCase()) {
        errors.email = ['Email is already registered'];
      }
      if (existingStudent.studentIdNumber === studentIdNumber) {
        errors.studentIdNumber = ['Student ID is already registered'];
      }
      if (existingStudent.nicNumber === nicNumber) {
        errors.nicNumber = ['NIC number is already registered'];
      }
      return errorResponse('Registration failed', errors, 400);
    }

    // Create new student
    const student = new Student({
      studentIdNumber: studentIdNumber.toUpperCase(),
      name,
      email: email.toLowerCase(),
      password,
      gender,
      dateOfBirth: new Date(dateOfBirth),
      address,
      nicNumber,
    });

    await student.save();

    // Generate JWT token
    const token = generateToken({
      userId: student._id.toString(),
      email: student.email,
      userRole: 'student',
    });

    // Remove password from response
    const studentData = student.toObject();
    delete studentData.password;

    return successResponse('Student registered successfully', {
      student: studentData,
      token,
    }, 201);
  } catch (error: any) {
    console.error('Student registration error:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return errorResponse('Registration failed', {
        [field]: [`This ${field} is already registered`],
      }, 400);
    }

    return serverErrorResponse('An error occurred during registration');
  }
}