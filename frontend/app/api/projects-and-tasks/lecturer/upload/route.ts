// /app/api/projects-and-tasks/lecturer/upload/route.ts

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/projects-and-tasks/jwt';
import { uploadToS3, isValidImageFile, isValidDocumentFile, getMaxFileSize } from '@/lib/projects-and-tasks/lecturer/s3-upload';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
  errorResponse,
} from '@/lib/projects-and-tasks/api-response';

export async function POST(request: NextRequest) {
  try {
    // Verify token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const payload = verifyToken(token);

    if (!payload || payload.userRole !== 'lecture') {
      return unauthorizedResponse('Only lecturers can upload files');
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const courseId = formData.get('courseId') as string;
    const fileType = formData.get('fileType') as 'image' | 'document';

    // Validation
    const errors: Record<string, string[]> = {};

    if (!file) {
      errors.file = ['File is required'];
    }

    if (!courseId) {
      errors.courseId = ['Course ID is required'];
    }

    if (!fileType || !['image', 'document'].includes(fileType)) {
      errors.fileType = ['File type must be image or document'];
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse('Validation failed', errors, 400);
    }

    // Validate file type
    if (fileType === 'image' && !isValidImageFile(file!.name)) {
      return errorResponse('Invalid image format. Allowed: jpg, png, gif, webp, svg', {
        file: ['Invalid file format'],
      }, 400);
    }

    if (fileType === 'document' && !isValidDocumentFile(file!.name)) {
      return errorResponse('Invalid document format. Allowed: pdf, doc, docx, xls, xlsx, ppt, pptx, txt', {
        file: ['Invalid file format'],
      }, 400);
    }

    // Validate file size
    const maxSize = getMaxFileSize(fileType);
    if (file!.size > maxSize) {
      const sizeInMB = maxSize / (1024 * 1024);
      return errorResponse(`File size exceeds ${sizeInMB}MB limit`, {
        file: [`File size must be less than ${sizeInMB}MB`],
      }, 400);
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file!.arrayBuffer());

    // Upload to S3
    const folder = fileType === 'image' ? 'templates/projects' : 'templates/projects';
    const url = await uploadToS3(buffer, file!.name, {
      folder,
      fileType,
      courseId,
    });

    return successResponse('File uploaded successfully', {
      url,
      fileName: file!.name,
      fileType,
      fileSize: file!.size,
    }, 200);
  } catch (error: any) {
    console.error('Upload error:', error);
    return serverErrorResponse('An error occurred while uploading the file');
  }
}