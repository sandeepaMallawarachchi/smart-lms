// /components/projects-and-tasks/lecturer/FileUpload.tsx

'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';

interface UploadedFile {
  url: string;
  name: string;
  fileType: 'image' | 'document';
  fileSize: number;
}

interface FileUploadProps {
  label?: string;
  fileType: 'image' | 'document';
  courseId: string;
  onFileUpload: (file: UploadedFile) => void;
  accept?: string;
  multiple?: boolean;
}

export default function FileUpload({
  label,
  fileType,
  courseId,
  onFileUpload,
  accept = fileType === 'image' ? '.jpg,.jpeg,.png,.gif,.webp,.svg' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip',
  multiple = false,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file size
    const maxSize = fileType === 'image' ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeInMB = maxSize / (1024 * 1024);
      toast.error(`File size must be less than ${sizeInMB}MB`);
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseId', courseId);
      formData.append('fileType', fileType);

      const xhr = new XMLHttpRequest();

      // Track progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            const uploadedFile: UploadedFile = {
              url: response.data.url,
              name: response.data.fileName,
              fileType: response.data.fileType,
              fileSize: response.data.fileSize,
            };
            onFileUpload(uploadedFile);
            toast.success(`${fileType === 'image' ? 'Image' : 'Document'} uploaded successfully`);
            setProgress(0);
            setIsUploading(false);
            
            // Reset input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        }
      });

      // Handle error
      xhr.addEventListener('error', () => {
        toast.error('Upload failed. Please try again.');
        setIsUploading(false);
        setProgress(0);
      });

      const token = localStorage.getItem('authToken');
      xhr.open('POST', '/api/projects-and-tasks/lecturer/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred during upload');
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      const validExtensions = fileType === 'image'
        ? ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
        : ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip'];
      
      const fileName = file.name.toLowerCase();
      const isValid = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isValid) {
        toast.error(`Invalid ${fileType} format`);
        return;
      }

      await uploadFile(file);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {!isUploading ? (
          <div>
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {fileType === 'image' ? 'JPG, PNG, GIF, WebP (Max 5MB)' : 'PDF, DOC, XLS, PPT (Max 20MB)'}
            </p>
          </div>
        ) : (
          <div>
            <Loader className="mx-auto h-8 w-8 text-blue-500 mb-2 animate-spin" />
            <p className="text-sm text-gray-600">Uploading...</p>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{progress}%</p>
          </div>
        )}
      </div>
    </div>
  );
}