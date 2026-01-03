// /components/projects-and-tasks/lecturer/createProjectTasks/ProjectCreationForm.tsx

'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Loader, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '../RichTextEditor';

interface FormState {
  projectName: string;
  description: { html: string; text: string };
  projectType: 'group' | 'individual' | '';
  deadlineDate: string;
  deadlineTime: string;
  specialNotes: { html: string; text: string };
  mainTasks: Array<{
    id: string;
    title: string;
    description?: string;
    subtasks?: Array<{ id: string; title: string; description?: string }>;
  }>;
}

interface ProjectCreationFormProps {
  courseId: string;
  lecturerId: string;
  onSuccess?: () => void;
}

export default function ProjectCreationForm({
  courseId,
  lecturerId,
  onSuccess,
}: ProjectCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [formState, setFormState] = useState<FormState>({
    projectName: '',
    description: { html: '', text: '' },
    projectType: '',
    deadlineDate: '',
    deadlineTime: '23:59',
    specialNotes: { html: '', text: '' },
    mainTasks: [],
  });

  // Validate form
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formState.projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }

    if (!formState.projectType) {
      newErrors.projectType = 'Project type is required';
    }

    if (!formState.deadlineDate) {
      newErrors.deadlineDate = 'Deadline date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix all errors');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(
        '/api/projects-and-tasks/lecturer/create-projects-and-tasks/project',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            courseId,
            lecturerId,
            projectName: formState.projectName,
            description: formState.description,
            projectType: formState.projectType,
            deadlineDate: formState.deadlineDate,
            deadlineTime: formState.deadlineTime,
            specialNotes: formState.specialNotes,
            mainTasks: formState.mainTasks,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }

      toast.success('Project created successfully!');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add main task
  const addMainTask = () => {
    if (!newTaskTitle.trim()) {
      toast.error('Enter task title');
      return;
    }

    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      description: '',
      subtasks: [],
    };

    setFormState({
      ...formState,
      mainTasks: [...formState.mainTasks, newTask],
    });

    setNewTaskTitle('');
    toast.success('Task added');
  };

  // Remove main task
  const removeMainTask = (id: string) => {
    setFormState({
      ...formState,
      mainTasks: formState.mainTasks.filter((task) => task.id !== id),
    });
  };

  const today = new Date().toISOString().split('T')[0];

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

      {/* Project Name */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Project Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={formState.projectName}
          onChange={(e) =>
            setFormState({ ...formState, projectName: e.target.value })
          }
          placeholder="Enter project name"
          maxLength={200}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
        />
        <div className="flex justify-between mt-2">
          <p className="text-xs text-gray-500">Max 200 characters</p>
          <p className="text-xs text-gray-400">{formState.projectName.length}/200</p>
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
          placeholder="Describe the project in detail..."
        />
      </div>

      {/* Project Type */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
          Project Type <span className="text-red-600">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          {(['group', 'individual'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFormState({ ...formState, projectType: type })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                formState.projectType === type
                  ? 'border-brand-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-semibold text-gray-900 capitalize">{type} Project</p>
              <p className="text-sm text-gray-600">
                {type === 'group'
                  ? 'Team-based project'
                  : 'Individual student project'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Deadline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Deadline Date <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={formState.deadlineDate}
              onChange={(e) =>
                setFormState({ ...formState, deadlineDate: e.target.value })
              }
              min={today}
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

      {/* Main Tasks */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
          Main Tasks (Optional)
        </label>
        
        {formState.mainTasks.length > 0 && (
          <div className="space-y-2 mb-4">
            {formState.mainTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <span className="font-medium text-gray-900">{task.title}</span>
                <button
                  type="button"
                  onClick={() => removeMainTask(task.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
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
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMainTask();
              }
            }}
            placeholder="Enter task title..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
          />
          <button
            type="button"
            onClick={addMainTask}
            className="px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add
          </button>
        </div>
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
          disabled={isSubmitting}
          className="px-6 py-3 bg-brand-yellow hover:bg-amber-500 disabled:bg-gray-400 text-white rounded-lg transition-colors font-semibold flex items-center gap-2 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader size={20} className="animate-spin" />
              Creating...
            </>
          ) : (
            'Create Project'
          )}
        </button>
      </div>
    </form>
  );
}