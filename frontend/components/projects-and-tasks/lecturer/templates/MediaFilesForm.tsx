// /components/projects-and-tasks/lecturer/templates/MediaFilesForm.tsx

import React, { useState } from 'react';
import { Image as ImageIcon, FileText, X, GripVertical } from 'lucide-react';
import FileUpload from '@/components/projects-and-tasks/lecturer/FileUpload';
import FormSection from './FormSection';

interface MediaFile {
  url: string;
  name: string;
  fileType: 'image' | 'document';
  fileSize: number;
  order: number;
}

interface MediaFilesFormProps {
  images: MediaFile[];
  documents: MediaFile[];
  courseId: string;
  onImageAdd: (file: MediaFile) => void;
  onImageRemove: (url: string) => void;
  onDocumentAdd: (file: MediaFile) => void;
  onDocumentRemove: (url: string) => void;
}

export default function MediaFilesForm({
  images,
  documents,
  courseId,
  onImageAdd,
  onImageRemove,
  onDocumentAdd,
  onDocumentRemove,
}: MediaFilesFormProps) {
  const [imageIndex, setImageIndex] = useState(images.length);
  const [docIndex, setDocIndex] = useState(documents.length);

  const handleImageUpload = (file: any) => {
    const newFile: MediaFile = {
      ...file,
      fileType: 'image',
      order: imageIndex + 1,
    };
    onImageAdd(newFile);
    setImageIndex(imageIndex + 1);
  };

  const handleDocumentUpload = (file: any) => {
    const newFile: MediaFile = {
      ...file,
      fileType: 'document',
      order: docIndex + 1,
    };
    onDocumentAdd(newFile);
    setDocIndex(docIndex + 1);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <FormSection
      title="Media Files"
      description="Add images and documents for the template"
      icon={<ImageIcon size={24} />}
      collapsible
    >
      <div className="space-y-8">
        {/* Images Section */}
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ImageIcon size={18} className="text-brand-blue" />
            Images
          </h4>

          <FileUpload
            label="Upload Images"
            fileType="image"
            courseId={courseId}
            onFileUpload={handleImageUpload}
          />

          {/* Uploaded Images */}
          {images.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                {images.length} image{images.length !== 1 ? 's' : ''} uploaded
              </p>
              {images.map((img) => (
                <div
                  key={img.url}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between hover:border-brand-blue transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <GripVertical size={18} className="text-gray-400 flex-shrink-0" />
                    <ImageIcon size={18} className="text-brand-blue flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {img.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(img.fileSize)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onImageRemove(img.url)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Remove image"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-brand-blue" />
            Documents
          </h4>

          <FileUpload
            label="Upload Documents"
            fileType="document"
            courseId={courseId}
            onFileUpload={handleDocumentUpload}
          />

          {/* Uploaded Documents */}
          {documents.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                {documents.length} document{documents.length !== 1 ? 's' : ''}{' '}
                uploaded
              </p>
              {documents.map((doc) => (
                <div
                  key={doc.url}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between hover:border-brand-blue transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <GripVertical size={18} className="text-gray-400 flex-shrink-0" />
                    <FileText size={18} className="text-brand-blue flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDocumentRemove(doc.url)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Remove document"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FormSection>
  );
}