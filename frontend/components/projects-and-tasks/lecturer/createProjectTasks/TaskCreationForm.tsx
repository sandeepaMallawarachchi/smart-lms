// /components/projects-and-tasks/lecturer/createProjectTasks/TaskCreationForm.tsx

'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Loader, AlertCircle, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '../RichTextEditor';

interface Subtask {
  id: string;
  title: string;
  description?: string;
}

interface FormState {
  taskName: string;
  description: { html: string; text: string };
  deadlineDate: string;
  deadlineTime: string;
  specialNotes: { html: string; text: string };
  subtasks: Subtask[];
}

interface TaskCreationFormProps {
  courseId: string;
  lecturerId: string;
  onSuccess?: () => void;
}

export default function TaskCreationForm({
  courseId,
  lecturerId,
  onSuccess,
}: TaskCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // File upload states
  const [templateDocs, setTemplateDocs] = useState<File[]>([]);
  const [otherDocs, setOtherDocs] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [formState, setFormState] = useState<FormState>({
    taskName: '',
    description: { html: '', text: '' },
    deadlineDate: '',
    deadlineTime: '23:59',
    specialNotes: { html: '', text: '' },
    subtasks: [],
  });

  // Validate form
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formState.taskName.trim()) {
      newErrors.taskName = 'Task name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit with files
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix all errors');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Add form fields
      formData.append('courseId', courseId);
      formData.append('lecturerId', lecturerId);
      formData.append('taskName', formState.taskName);
      formData.append('description', JSON.stringify(formState.description));
      formData.append('deadlineDate', formState.deadlineDate);
      formData.append('deadlineTime', formState.deadlineTime);
      formData.append('specialNotes', JSON.stringify(formState.specialNotes));
      formData.append('subtasks', JSON.stringify(formState.subtasks));

      // Add files
      templateDocs.forEach((file) => {
        formData.append('templateDocuments', file);
      });
      otherDocs.forEach((file) => {
        formData.append('otherDocuments', file);
      });
      imageFiles.forEach((file) => {
        formData.append('images', file);
      });

      const token = localStorage.getItem('authToken');

      const response = await fetch(
        '/api/projects-and-tasks/lecturer/create-projects-and-tasks/task',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create task');
      }

      toast.success('Task created successfully!');
      onSuccess?.();
    } catch (error: any) {
      console.error('Task creation error:', error);
      toast.error(error.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add subtask
  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) {
      toast.error('Enter subtask title');
      return;
    }

    const newSubtask: Subtask = {
      id: Date.now().toString(),
      title: newSubtaskTitle,
      description: '',
    };

    setFormState({
      ...formState,
      subtasks: [...formState.subtasks, newSubtask],
    });

    setNewSubtaskTitle('');
    toast.success('Subtask added');
  };

  // Remove subtask
  const removeSubtask = (id: string) => {
    setFormState({
      ...formState,
      subtasks: formState.subtasks.filter((task) => task.id !== id),
    });
  };

  // File handlers
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'template' | 'other' | 'image'
  ) => {
    const files = Array.from(e.target.files || []);
    const maxSize = type === 'image' ? 10 : 50; // MB

    const validFiles = files.filter((file) => {
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${maxSize}MB limit`);
        return false;
      }
      return true;
    });

    if (type === 'template') {
      setTemplateDocs([...templateDocs, ...validFiles]);
    } else if (type === 'other') {
      setOtherDocs([...otherDocs, ...validFiles]);
    } else {
      setImageFiles([...imageFiles, ...validFiles]);
    }
  };

  // Remove file
  const removeFile = (
    fileName: string,
    type: 'template' | 'other' | 'image'
  ) => {
    if (type === 'template') {
      setTemplateDocs(templateDocs.filter((f) => f.name !== fileName));
    } else if (type === 'other') {
      setOtherDocs(otherDocs.filter((f) => f.name !== fileName));
    } else {
      setImageFiles(imageFiles.filter((f) => f.name !== fileName));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-semibold flex items-center gap-2 mb-2">
            <AlertCircle size={20} />
            Please fix the following errors:
          </p>
          <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
            {Object.values(errors).map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Task Name */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Task Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={formState.taskName}
          onChange={(e) =>
            setFormState({ ...formState, taskName: e.target.value })
          }
          placeholder="Enter task name"
          maxLength={200}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
        />
        <div className="flex justify-between mt-2">
          <p className="text-xs text-gray-500">Max 200 characters</p>
          <p className="text-xs text-gray-400">{formState.taskName.length}/200</p>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Description
        </label>
        <RichTextEditor
          value={formState.description}
          onChange={(content) => setFormState({ ...formState, description: content })}
          placeholder="Describe the task in detail..."
        />
      </div>

      {/* Deadline (Optional) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
          Deadline (Optional)
        </label>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Deadline Date
            </label>
            <input
              type="date"
              value={formState.deadlineDate}
              onChange={(e) =>
                setFormState({ ...formState, deadlineDate: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Deadline Time
            </label>
            <input
              type="time"
              value={formState.deadlineTime}
              onChange={(e) =>
                setFormState({ ...formState, deadlineTime: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
        </div>
      </div>

      {/* Special Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Special Notes (Optional)
        </label>
        <RichTextEditor
          value={formState.specialNotes}
          onChange={(content) =>
            setFormState({ ...formState, specialNotes: content })
          }
          placeholder="Add any special instructions or notes..."
        />
      </div>

      {/* Subtasks */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
          Subtasks (Optional)
        </label>

        {formState.subtasks.length > 0 && (
          <div className="space-y-2 mb-4">
            {formState.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-2 h-2 bg-brand-blue rounded-full"></div>
                  <span className="font-medium text-gray-900">{subtask.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSubtask(subtask.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors ml-2"
                  title="Remove subtask"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSubtask();
              }
            }}
            placeholder="Enter subtask title..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
          />
          <button
            type="button"
            onClick={addSubtask}
            className="px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add
          </button>
        </div>
      </div>

      {/* Template Documents Upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
          Template Documents (Optional)
        </label>

        {templateDocs.length > 0 && (
          <div className="space-y-2 mb-4">
            {templateDocs.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <span className="text-sm text-gray-700">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(file.name, 'template')}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
          <Upload size={20} className="text-gray-600" />
          <span className="text-sm text-gray-700">Click to upload templates (max 50MB each)</span>
          <input
            type="file"
            multiple
            onChange={(e) => handleFileChange(e, 'template')}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          />
        </label>
      </div>

      {/* Other Documents Upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
          Other Documents (Optional)
        </label>

        {otherDocs.length > 0 && (
          <div className="space-y-2 mb-4">
            {otherDocs.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <span className="text-sm text-gray-700">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(file.name, 'other')}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
          <Upload size={20} className="text-gray-600" />
          <span className="text-sm text-gray-700">Click to upload documents (max 50MB each)</span>
          <input
            type="file"
            multiple
            onChange={(e) => handleFileChange(e, 'other')}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          />
        </label>
      </div>

      {/* Images Upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
          Images (Optional)
        </label>

        {imageFiles.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {imageFiles.map((file) => (
              <div key={file.name} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeFile(file.name, 'image')}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
          <Upload size={20} className="text-gray-600" />
          <span className="text-sm text-gray-700">Click to upload images (max 10MB each)</span>
          <input
            type="file"
            multiple
            onChange={(e) => handleFileChange(e, 'image')}
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp"
          />
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4 sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-lg shadow-lg">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || Object.keys(errors).length > 0}
          className="px-6 py-3 bg-brand-yellow hover:bg-amber-500 disabled:bg-gray-400 text-white rounded-lg transition-colors font-semibold flex items-center gap-2 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader size={20} className="animate-spin" />
              Creating...
            </>
          ) : (
            'Create Task'
          )}
        </button>
      </div>
    </form>
  );
}