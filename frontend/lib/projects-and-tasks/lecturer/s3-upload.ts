// /lib/projects-and-tasks/lecturer/s3-upload.ts

import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION,
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

interface UploadOptions {
  folder: 'templates/projects' | 'templates/tasks' | 'projects' | 'tasks';
  fileType: 'image' | 'document';
  courseId: string;
  fileName?: string;
}

export async function uploadToS3(
  file: Buffer,
  fileName: string,
  options: UploadOptions
): Promise<string> {
  try {
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const fileExtension = fileName.split('.').pop();
    
    // Create structured S3 key
    const s3Key = `${options.folder}/${options.courseId}/${timestamp}-${uniqueId}-${fileName}`;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: file,
      ContentType: getContentType(fileExtension || ''),
      ACL: 'public-read',
      Metadata: {
        'uploaded-by': 'template-builder',
        'file-type': options.fileType,
        'timestamp': new Date().toISOString(),
      },
    };

    const result = await s3.upload(params).promise();
    return result.Location; // Returns full S3 URL
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
}

export async function deleteFromS3(fileUrl: string): Promise<void> {
  try {
    // Extract key from URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error('Failed to delete file from S3');
  }
}

export async function deleteMultipleFromS3(fileUrls: string[]): Promise<void> {
  try {
    const objects = fileUrls.map((url) => {
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1);
      return { Key: key };
    });

    if (objects.length === 0) return;

    const params: AWS.S3.DeleteObjectsRequest = {
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: objects,
      },
    };

    await s3.deleteObjects(params).promise();
  } catch (error) {
    console.error('S3 Delete Multiple Error:', error);
    throw new Error('Failed to delete files from S3');
  }
}

function getContentType(fileExtension: string): string {
  const contentTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
  };

  return contentTypes[fileExtension.toLowerCase()] || 'application/octet-stream';
}

export function isValidImageFile(fileName: string): boolean {
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const extension = fileName.split('.').pop()?.toLowerCase();
  return validExtensions.includes(extension || '');
}

export function isValidDocumentFile(fileName: string): boolean {
  const validExtensions = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'
  ];
  const extension = fileName.split('.').pop()?.toLowerCase();
  return validExtensions.includes(extension || '');
}

export function getMaxFileSize(fileType: 'image' | 'document'): number {
  return fileType === 'image' ? 5 * 1024 * 1024 : 20 * 1024 * 1024; // 5MB images, 20MB documents
}