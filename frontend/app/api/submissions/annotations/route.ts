import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import LecturerAnnotation from '@/model/submissions/annotationModel';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { verifyToken } from '@/lib/jwt';

/** Helper: extract & verify token, require lecturer role. */
function authLecturer(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.userRole !== 'lecture') return null;
  return payload;
}

/** Helper: extract & verify token for any role. */
function authAny(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

// ─── GET: list annotations for a version + question ──────────

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const payload = authAny(request);
    if (!payload) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');
    const questionId = searchParams.get('questionId');

    if (!versionId || !questionId) {
      return errorResponse('versionId and questionId are required');
    }

    const annotations = await LecturerAnnotation.find({ versionId, questionId })
      .sort({ start: 1 })
      .lean();

    return successResponse('Annotations fetched', annotations);
  } catch (err) {
    console.error('GET /api/submissions/annotations error:', err);
    return serverErrorResponse('Failed to fetch annotations');
  }
}

// ─── POST: create a new annotation (lecturer only) ────────────

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const payload = authLecturer(request);
    if (!payload) return unauthorizedResponse('Lecturer access required');

    const body = await request.json();
    const { submissionId, versionId, questionId, start, end, selectedText, comment } = body as {
      submissionId?: string;
      versionId?: string;
      questionId?: string;
      start?: number;
      end?: number;
      selectedText?: string;
      comment?: string;
    };

    if (!submissionId || !versionId || !questionId || start == null || end == null || !selectedText || !comment) {
      return errorResponse('Missing required fields');
    }

    const annotation = await LecturerAnnotation.create({
      submissionId,
      versionId,
      questionId,
      lecturerId: payload.userId,
      start,
      end,
      selectedText,
      comment,
    });

    return successResponse('Annotation created', annotation, 201);
  } catch (err) {
    console.error('POST /api/submissions/annotations error:', err);
    return serverErrorResponse('Failed to create annotation');
  }
}

// ─── DELETE: remove an annotation (lecturer only) ─────────────

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const payload = authLecturer(request);
    if (!payload) return unauthorizedResponse('Lecturer access required');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return errorResponse('id is required');

    const annotation = await LecturerAnnotation.findById(id);
    if (!annotation) return errorResponse('Annotation not found', undefined, 404);

    // Only the creator can delete
    if (annotation.lecturerId !== payload.userId) {
      return unauthorizedResponse('You can only delete your own annotations');
    }

    await annotation.deleteOne();
    return successResponse('Annotation deleted');
  } catch (err) {
    console.error('DELETE /api/submissions/annotations error:', err);
    return serverErrorResponse('Failed to delete annotation');
  }
}
