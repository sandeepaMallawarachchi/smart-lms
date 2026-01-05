// /app/projects-and-tasks/lecturer/templates/create/[type]/page.tsx

'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ItemSelector from '@/components/projects-and-tasks/lecturer/templates/ItemSelector';
import BasicInfoForm from '@/components/projects-and-tasks/lecturer/templates/BasicInfoForm';
import SpecialNotesForm from '@/components/projects-and-tasks/lecturer/templates/SpecialNotesForm';
import MarkingRubricForm from '@/components/projects-and-tasks/lecturer/templates/MarkingRubricForm';
import DeadlineForm from '@/components/projects-and-tasks/lecturer/templates/DeadlineForm';
import MediaFilesForm from '@/components/projects-and-tasks/lecturer/templates/MediaFilesForm';
import NotificationsForm from '@/components/projects-and-tasks/lecturer/templates/NotificationsForm';
import TasksForm from '@/components/projects-and-tasks/lecturer/templates/TasksForm';

interface PageProps {
  params: Promise<{
    type: 'project' | 'task';
  }>;
}

const TEMPLATE_ITEMS = [
  {
    id: 'basic',
    label: 'Basic Information',
    description: 'Project/task name and description',
    category: 'Core',
    required: true,
  },
  {
    id: 'deadline',
    label: 'Deadline & Marking',
    description: 'Set deadline date, time, and total marks',
    category: 'Core',
    required: true,
  },
  {
    id: 'tasks',
    label: 'Tasks & Subtasks',
    description: 'Define tasks and subtasks',
    category: 'Core',
    required: true,
  },
  {
    id: 'special-notes',
    label: 'Special Notes',
    description: 'Add important instructions and notes',
    category: 'Optional',
    required: false,
  },
  {
    id: 'marking-rubric',
    label: 'Marking Rubric',
    description: 'Define marking criteria and expectations',
    category: 'Optional',
    required: false,
  },
  {
    id: 'media',
    label: 'Media Files',
    description: 'Upload images and documents',
    category: 'Optional',
    required: false,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Add messages to notify students',
    category: 'Optional',
    required: false,
  },
];

export default function CreateTemplatePage({ params: paramsPromise }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');

  // Unwrap Promise for params
  const params = use(paramsPromise);
  const templateType = params.type;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>(['basic', 'deadline', 'tasks']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Form State - Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState({ html: '', text: '' });

  // Form State - Optional
  const [specialNotes, setSpecialNotes] = useState({ html: '', text: '' });
  const [markingDescription, setMarkingDescription] = useState({ html: '', text: '' });

  // Form State - Deadline
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [totalMarks, setTotalMarks] = useState(0);

  // Form State - Media
  const [images, setImages] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Form State - Notifications
  const [notifications, setNotifications] = useState<any[]>([]);

  // Form State - Tasks
  const [mainTasks, setMainTasks] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);

  // Initialize page
  useEffect(() => {
    if (templateType && courseId) {
      setIsLoading(false);
    }
  }, [templateType, courseId]);

  // Validate form on changes
  useEffect(() => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Please enter a template name';
    }

    if (!deadlineDate) {
      newErrors.deadline = 'Please select a deadline date';
    }

    if (templateType === 'task' && subtasks.length === 0) {
      newErrors.subtasks = 'Please add at least one subtask';
    }

    if (templateType === 'project' && mainTasks.length === 0) {
      newErrors.mainTasks = 'Please add at least one main task';
    }

    setErrors(newErrors);
  }, [name, deadlineDate, templateType, subtasks.length, mainTasks.length]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    if (!courseId) {
      toast.error('Course ID is missing');
      return;
    }

    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!deadlineDate) {
      toast.error('Please select a deadline date');
      return;
    }

    if (templateType === 'task' && subtasks.length === 0) {
      toast.error('Please add at least one subtask');
      return;
    }

    if (templateType === 'project' && mainTasks.length === 0) {
      toast.error('Please add at least one main task');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');

      // Determine the correct endpoint based on template type
      const endpoint =
        templateType === 'project'
          ? '/api/projects-and-tasks/lecturer/templates/project'
          : '/api/projects-and-tasks/lecturer/templates/task';

      const templateData = {
        courseId,
        projectName: name,
        description,
        specialNotes: selectedItems.includes('special-notes') ? specialNotes : undefined,
        markingDescription: selectedItems.includes('marking-rubric') ? markingDescription : undefined,
        deadlineDate,
        deadlineTime,
        totalMarks: totalMarks || 0,
        images: selectedItems.includes('media') ? images : [],
        documents: selectedItems.includes('media') ? documents : [],
        notifications: selectedItems.includes('notifications') ? notifications : [],
        isSingleTaskTemplate: templateType === 'task',
        mainTasks: templateType === 'project' ? mainTasks : [],
        subtasks: templateType === 'task' ? subtasks : [],
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create template (${response.status})`);
      }

      const data = await response.json();
      toast.success('Template created successfully!');

      // Redirect back to templates list
      router.push(`/projects-and-tasks/lecturer/templates?courseId=${courseId}`);
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to create template');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while params load
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-brand-blue" size={40} />
      </div>
    );
  }

  // Missing course ID
  if (!courseId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />
          <p className="text-red-600 font-semibold mb-4">Course ID is missing</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create {templateType === 'project' ? 'Project' : 'Task'} Template
          </h1>
          <p className="text-gray-600">
            Select items to include in your template
          </p>
        </div>

        {/* Error Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
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

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Item Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <ItemSelector
              items={TEMPLATE_ITEMS}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
              title="Customize Your Template"
            />
          </div>

          {/* Form Sections Based on Selected Items */}
          <div className="space-y-6">
            {/* Basic Information (Always shown) */}
            <BasicInfoForm
              templateType={templateType}
              name={name}
              description={description}
              onNameChange={setName}
              onDescriptionChange={setDescription}
            />

            {/* Deadline Form (Always shown) */}
            <DeadlineForm
              deadlineDate={deadlineDate}
              deadlineTime={deadlineTime}
              totalMarks={totalMarks}
              onDateChange={setDeadlineDate}
              onTimeChange={setDeadlineTime}
              onMarksChange={setTotalMarks}
            />

            {/* Tasks Form (Always shown) */}
            <TasksForm
              isSingleTaskTemplate={templateType === 'task'}
              mainTasks={mainTasks}
              subtasks={subtasks}
              onTasksChange={setMainTasks}
              onSubtasksChange={setSubtasks}
            />

            {/* Special Notes - Conditional */}
            {selectedItems.includes('special-notes') && (
              <SpecialNotesForm
                notes={specialNotes}
                onNotesChange={setSpecialNotes}
              />
            )}

            {/* Marking Rubric - Conditional */}
            {selectedItems.includes('marking-rubric') && (
              <MarkingRubricForm
                markingDescription={markingDescription}
                onMarkingChange={setMarkingDescription}
              />
            )}

            {/* Media Files - Conditional */}
            {selectedItems.includes('media') && (
              <MediaFilesForm
                images={images}
                documents={documents}
                courseId={courseId}
                onImageAdd={(img) => setImages([...images, img])}
                onImageRemove={(url) => setImages(images.filter((img) => img.url !== url))}
                onDocumentAdd={(doc) => setDocuments([...documents, doc])}
                onDocumentRemove={(url) => setDocuments(documents.filter((doc) => doc.url !== url))}
              />
            )}

            {/* Notifications - Conditional */}
            {selectedItems.includes('notifications') && (
              <NotificationsForm
                notifications={notifications}
                onNotificationsChange={setNotifications}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-lg shadow-lg">
            <button
              type="button"
              onClick={() => router.back()}
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
                <>
                  Create {templateType === 'project' ? 'Project' : 'Task'} Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}