'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File } from 'lucide-react';
import { Button } from '@/components/it22586766/ui/Button';
import { formatFileSize } from '@/lib/it22586766/utils';
import toast from 'react-hot-toast';

interface FileUploadProps {
    onUpload: (files: File[]) => Promise<void>;
    maxSize?: number;
    maxFiles?: number;
    accept?: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
                                                          onUpload,
                                                          maxSize = 50 * 1024 * 1024, // 50MB
                                                          maxFiles = 10,
                                                          accept = [],
                                                      }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles((prev) => [...prev, ...acceptedFiles].slice(0, maxFiles));
    }, [maxFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxSize,
        maxFiles,
        accept: accept.length > 0 ? accept.reduce((acc, curr) => ({ ...acc, [curr]: [] }), {}) : undefined,
    });

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        try {
            await onUpload(files);
            setFiles([]);
            toast.success('Files uploaded successfully!');
        } catch (error) {
            toast.error('Failed to upload files');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400'
                }`}
            >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                    <p className="text-sm text-gray-600">Drop files here...</p>
                ) : (
                    <div>
                        <p className="text-sm text-gray-600 mb-2">
                            Drag and drop files here, or click to select
                        </p>
                        <p className="text-xs text-gray-500">
                            Max {maxFiles} files, up to {formatFileSize(maxSize)} each
                        </p>
                    </div>
                )}
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                        Selected Files ({files.length})
                    </h4>
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                            <div className="flex items-center space-x-3">
                                <File className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => removeFile(index)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                    <Button
                        onClick={handleUpload}
                        loading={uploading}
                        className="w-full"
                    >
                        Upload {files.length} file(s)
                    </Button>
                </div>
            )}
        </div>
    );
};