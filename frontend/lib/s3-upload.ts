// /lib/s3-upload.ts

import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION,
});

export interface UploadedFile {
  url: string;
  name: string;
  fileSize: number;
}

/**
 * Upload a single file to S3
 * @param fileBuffer - Buffer of the file
 * @param fileName - Name of the file
 * @param folder - S3 folder path (e.g., 'projects/template-docs')
 * @returns Upload result with url, name, and fileSize
 */
export async function uploadFileToS3(
  fileBuffer: Buffer,
  fileName: string,
  folder: string
): Promise<UploadedFile> {
  try {
    // Generate unique key with timestamp
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName.replace(/\s+/g, '-')}`;
    const key = `${folder}/${uniqueFileName}`;

    // ✅ FIXED: Removed ACL parameter for buckets with ACL disabled
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Body: fileBuffer,
      ContentType: getContentType(fileName),
      // ❌ REMOVED: ACL: 'public-read' as any,
      // This was causing: "AccessControlListNotSupported: The bucket does not allow ACLs"
    };

    const result = await s3.upload(params).promise();

    return {
      url: result.Location,
      name: fileName,
      fileSize: fileBuffer.length,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file: ${error}`);
  }
}

/**
 * Upload multiple files to S3
 * @param files - Array of {buffer, name}
 * @param folder - S3 folder path
 * @returns Array of upload results
 */
export async function uploadFilesToS3(
  files: Array<{ buffer: Buffer; name: string }>,
  folder: string
): Promise<UploadedFile[]> {
  const uploadPromises = files.map((file) =>
    uploadFileToS3(file.buffer, file.name, folder)
  );

  return Promise.all(uploadPromises);
}

/**
 * Delete a file from S3
 * @param fileUrl - Full S3 URL of the file
 */
export async function deleteFileFromS3(fileUrl: string): Promise<void> {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    // Extract key from URL
    const key = fileUrl.split(`${bucketName}/`)[1];

    if (!key) {
      throw new Error('Invalid S3 URL');
    }

    const params = {
      Bucket: bucketName,
      Key: decodeURIComponent(key),
    };

    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`Failed to delete file: ${error}`);
  }
}

/**
 * Determine content type based on file extension
 */
function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();

  const contentTypes: { [key: string]: string } = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
  };

  return contentTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Validate file type and size
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 50,
  allowedTypes: string[] = []
): { valid: boolean; error?: string } {
  // Check size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  // Check type if specified
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}