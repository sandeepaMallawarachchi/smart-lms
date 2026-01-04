import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/model/Student';
import { generateToken } from '@/lib/jwt';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const { 
      studentIdNumber, 
      name, 
      email, 
      password, 
      passwordConfirmation, 
      gender, 
      dateOfBirth, 
      address, 
      nicNumber, 
      academicYear, 
      semester, 
      specialization 
    } = body;

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
    if (!academicYear) errors.academicYear = ['Academic Year is required'];
    if (!semester) errors.semester = ['Semester is required'];
    if (!specialization) errors.specialization = ['Specialization is required'];

    // Validate enum values
    if (academicYear && !['1', '2', '3', '4'].includes(academicYear)) {
      errors.academicYear = ['Academic year must be 1, 2, 3, or 4'];
    }
    if (semester && !['1', '2'].includes(semester)) {
      errors.semester = ['Semester must be 1 or 2'];
    }
    if (specialization && !['IT', 'SE', 'DS', 'CSNE', 'CS', 'IM'].includes(specialization)) {
      errors.specialization = ['Invalid specialization'];
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse('Validation failed', errors, 400);
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [
        { email: email.toLowerCase() }, 
        { studentIdNumber: studentIdNumber.toLowerCase() },
        { nicNumber }
      ],
    });

    if (existingStudent) {
      if (existingStudent.email === email.toLowerCase()) {
        errors.email = ['Email is already registered'];
      }
      if (existingStudent.studentIdNumber === studentIdNumber.toLowerCase()) {
        errors.studentIdNumber = ['Student ID is already registered'];
      }
      if (existingStudent.nicNumber === nicNumber) {
        errors.nicNumber = ['NIC number is already registered'];
      }
      return errorResponse('Registration failed', errors, 400);
    }

    // Create new student
    const student = new Student({
      studentIdNumber,
      name,
      email: email.toLowerCase(),
      password,
      gender,
      dateOfBirth: new Date(dateOfBirth),
      address,
      nicNumber,
      academicYear,
      semester,
      specialization,
    });

    // Save and handle validation errors
    try {
      await student.save();
    } catch (saveError: any) {
      console.error('Mongoose validation error:', saveError);
      
      if (saveError.name === 'ValidationError') {
        const validationErrors: Record<string, string[]> = {};
        for (const field in saveError.errors) {
          validationErrors[field] = [saveError.errors[field].message];
        }
        return errorResponse('Validation failed', validationErrors, 400);
      }
      throw saveError;
    }

    // Generate JWT token
    const token = generateToken({
      userId: student._id.toString(),
      email: student.email,
      userRole: 'student',
    });

    // Get student data without password
    const studentData = await Student.findById(student._id).select('-password').lean();

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