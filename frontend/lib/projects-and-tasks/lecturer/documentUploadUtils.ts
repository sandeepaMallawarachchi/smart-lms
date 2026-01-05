// /lib/projects-and-tasks/lecturer/documentUploadUtils.ts

/**
 * Validate file size
 * @param fileSize - Size in bytes
 * @param maxSizeMB - Maximum allowed size in MB
 * @returns boolean
 */
export function validateFileSize(fileSize: number, maxSizeMB: number = 50): boolean {
  return fileSize <= maxSizeMB * 1024 * 1024;
}

/**
 * Validate file type
 * @param fileName - File name with extension
 * @param allowedTypes - Array of allowed file extensions (without dot)
 * @returns boolean
 */
export function validateFileType(fileName: string, allowedTypes: string[]): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

/**
 * Get readable file size
 * @param bytes - File size in bytes
 * @returns string - Formatted file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Upload file to storage (e.g., AWS S3, Vercel Blob, etc.)
 * Replace with your actual upload implementation
 */
export async function uploadFileToStorage(file: File): Promise<{ url: string; name: string; fileSize: number }> {
  // This is a placeholder. Implement with your actual storage solution
  // For now, we'll create a mock response
  return {
    url: `https://storage.example.com/${file.name}`,
    name: file.name,
    fileSize: file.size,
  };
}

/**
 * Allowed file types
 */
export const ALLOWED_FILE_TYPES = {
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
};

/**
 * Max file size in MB
 */
export const MAX_FILE_SIZE_MB = 50;