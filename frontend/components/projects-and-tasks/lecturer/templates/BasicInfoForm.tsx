// /components/projects-and-tasks/lecturer/templates/BasicInfoForm.tsx

'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import RichTextEditor from '../RichTextEditor';

interface BasicInfoFormProps {
  templateType: 'project' | 'task';
  name: string;
  description: { html: string; text: string };
  onNameChange: (name: string) => void;
  onDescriptionChange: (desc: { html: string; text: string }) => void;
}

export default function BasicInfoForm({
  templateType,
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: BasicInfoFormProps) {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNameChange(e.target.value);
  };

  const handleDescriptionChange = (content: { html: string; text: string }) => {
    onDescriptionChange(content);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="text-brand-blue" size={24} />
        <h2 className="text-2xl font-semibold text-gray-900">
          Basic Information
        </h2>
      </div>

      {/* Template Name */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          {templateType === 'project' ? 'Project' : 'Task'} Name
          <span className="text-red-600 ml-1">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder={`Enter ${templateType} name (max 200 characters)`}
          maxLength={200}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
        />
        <div className="flex justify-between mt-2">
          <p className="text-xs text-gray-500">
            Provide a clear, descriptive name for your {templateType}
          </p>
          <p className="text-xs text-gray-400">
            {name.length}/200
          </p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Description
        </label>
        <RichTextEditor
          value={description}
          onChange={handleDescriptionChange}
          placeholder={`Describe the ${templateType} in detail...`}
        />
        <p className="text-xs text-gray-500 mt-2">
          Provide context and instructions for students
        </p>
      </div>
    </div>
  );
}