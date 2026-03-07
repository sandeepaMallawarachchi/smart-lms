import { NextRequest } from 'next/server';
import type { FilterQuery } from 'mongoose';
import { connectDB } from '@/lib/db';
import Prediction from '@/model/Prediction';
import Student from '@/model/Student';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';

// POST - Save a new prediction
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const {
      studentId,
      studentIdNumber,
      inputData,
      prediction,
      recommendations,
      apiTimestamp,
      semester,
      academicYear,
      specialization,
    } = body;

    // Validation
    const errors: Record<string, string[]> = {};

    if (!studentId) errors.studentId = ['Student ID is required'];
    if (!studentIdNumber) errors.studentIdNumber = ['Student ID number is required'];
    if (!inputData) errors.inputData = ['Input data is required'];
    if (!prediction) errors.prediction = ['Prediction data is required'];
    if (!recommendations) errors.recommendations = ['Recommendations are required'];
    if (!semester) errors.semester = ['Semester is required'];
    if (!academicYear) errors.academicYear = ['Academic year is required'];
    if (!specialization) errors.specialization = ['Specialization is required'];

    if (Object.keys(errors).length > 0) {
      return errorResponse('Validation failed', errors, 400);
    }

    // Verify student exists
    const student = await Student.findById(studentId);

    if (!student) {
      return errorResponse('Student not found', { studentId: ['Student does not exist'] }, 404);
    }

    // Check if student ID matches
    if (student.studentIdNumber !== studentIdNumber.toLowerCase()) {
      return errorResponse('Student ID mismatch', { studentIdNumber: ['Student ID does not match'] }, 400);
    }

    // Create new prediction
    const normalizedRiskFactors = Array.isArray(prediction?.risk_factors)
      ? prediction.risk_factors.map((factor: unknown) => {
          if (typeof factor === 'string') return factor;
          if (factor && typeof factor === 'object' && 'description' in (factor as Record<string, unknown>)) {
            return String((factor as Record<string, unknown>).description || '');
          }
          return JSON.stringify(factor);
        }).filter(Boolean)
      : [];

    const normalizedPrediction = {
      at_risk: Boolean(prediction.at_risk),
      confidence: Number(prediction.confidence ?? 0),
      risk_level: String(prediction.risk_level || 'low').toLowerCase(),
      risk_probability: Number(prediction.risk_probability ?? 0),
      risk_factors: normalizedRiskFactors,
    };

    const newPrediction = new Prediction({
      studentId,
      studentIdNumber: studentIdNumber.toLowerCase(),
      inputData,
      prediction: normalizedPrediction,
      recommendations: recommendations || prediction?.recommendations,
      apiTimestamp: apiTimestamp || new Date().toISOString(),
      semester,
      academicYear,
      specialization,
    });

    await newPrediction.save();

    return successResponse('Prediction saved successfully', {
      prediction: newPrediction,
    }, 201);
  } catch (error: unknown) {
    console.error('Save prediction error:', error);
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'ValidationError') {
      const validationError = error as {
        errors?: Record<string, { message?: string }>;
        message?: string;
      };
      const details: Record<string, string[]> = {};
      if (validationError.errors) {
        for (const [field, fieldError] of Object.entries(validationError.errors)) {
          details[field] = [fieldError?.message || 'Invalid value'];
        }
      }
      return errorResponse(validationError.message || 'Validation failed', details, 400);
    }
    return serverErrorResponse('An error occurred while saving prediction');
  }
}

// GET - Get all predictions (with optional filters)
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

    if (!payload) {
      return unauthorizedResponse('Unauthorized');
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const studentIdNumber = searchParams.get('studentIdNumber');
    const riskLevel = searchParams.get('riskLevel');
    const atRisk = searchParams.get('atRisk');
    const semester = searchParams.get('semester');
    const academicYear = searchParams.get('academicYear');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');

    // Build filter
    const filter: FilterQuery<unknown> = {};

    if (studentId) filter.studentId = studentId;
    if (studentIdNumber) filter.studentIdNumber = studentIdNumber.toLowerCase();
    if (riskLevel) filter['prediction.risk_level'] = riskLevel;
    if (atRisk !== null && atRisk !== undefined) {
      filter['prediction.at_risk'] = atRisk === 'true';
    }
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    // If student role, only show their own predictions
    if (payload.userRole === 'student') {
      filter.studentId = payload.userId;
    }

    // Fetch predictions with pagination
    const skip = (page - 1) * limit;
    
    const predictions = await Prediction.find(filter)
      .populate('studentId', 'name email studentIdNumber')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Prediction.countDocuments(filter);

    return successResponse('Predictions retrieved successfully', {
      predictions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }, 200);
  } catch (error: unknown) {
    console.error('Get predictions error:', error);
    return serverErrorResponse('An error occurred while fetching predictions');
  }
}
