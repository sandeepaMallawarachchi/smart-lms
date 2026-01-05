// File: /app/projects-and-tasks/lecturer/templates/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Loader, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  _id: string;
  projectName: string;
  description: { text: string };
  deadlineDate: string;
  totalMarks: number;
  isSingleTaskTemplate: boolean;
  createdAt: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'project' | 'task'>('project');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get selected course from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedCourse');
    if (stored) {
      try {
        setSelectedCourse(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse selected course');
      }
    }
  }, []);

  // Listen for course selection event
  useEffect(() => {
    const handleCourseSelected = (e: CustomEvent) => {
      setSelectedCourse(e.detail);
      localStorage.setItem('selectedCourse', JSON.stringify(e.detail));
      setTemplates([]); // Reset templates when course changes
    };

    window.addEventListener('courseSelected', handleCourseSelected as EventListener);
    return () => window.removeEventListener('courseSelected', handleCourseSelected as EventListener);
  }, []);

  // Fetch templates
  useEffect(() => {
    if (!selectedCourse?._id) {
      setIsLoading(false);
      return;
    }

    const fetchTemplates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const endpoint =
          activeTab === 'project'
            ? `/api/projects-and-tasks/lecturer/templates/project?course=${selectedCourse._id}`
            : `/api/projects-and-tasks/lecturer/templates/task?course=${selectedCourse._id}`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch templates (${response.status})`);
        }

        const data = await response.json();
        
        // Handle different API response formats
        let templatesArray: Template[] = [];
        
        if (Array.isArray(data)) {
          // If response is directly an array
          templatesArray = data;
        } else if (data?.data && Array.isArray(data.data)) {
          // If response has .data property with array
          templatesArray = data.data;
        } else if (data?.templates && Array.isArray(data.templates)) {
          // If response has .templates property
          templatesArray = data.templates;
        } else if (data?.success === false) {
          // If API returns success: false
          console.warn('API returned success: false');
          templatesArray = [];
        } else {
          // Unexpected response format
          console.warn('Unexpected API response format:', data);
          templatesArray = [];
        }

        setTemplates(Array.isArray(templatesArray) ? templatesArray : []);
      } catch (error: any) {
        console.error('Fetch error:', error);
        setError(error.message);
        toast.error('Failed to load templates');
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [selectedCourse?._id, activeTab]);

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    setDeleting(templateId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `/api/projects-and-tasks/lecturer/templates/${templateId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setTemplates(templates.filter((t) => t._id !== templateId));
      toast.success('Template deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete template');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'No date set';
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Not authenticated or no course selected
  if (!selectedCourse) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">Course Selection Required</h2>
            <p className="text-yellow-800 mb-4">
              Please select a course from the header dropdown to view and manage templates.
            </p>
          </div>
          <button
            onClick={() => router.push('/projects-and-tasks/lecturer')}
            className="px-6 py-3 bg-brand-blue hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Template Builder</h1>
              <p className="text-gray-600 mt-2">
                Create and manage reusable templates for <span className="font-semibold text-brand-blue">{selectedCourse.courseName}</span>
              </p>
            </div>
            <button
              onClick={() => router.push('/projects-and-tasks/lecturer')}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              title="Back to dashboard"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">⚠️ Error: {error}</p>
            <p className="text-red-700 text-sm mt-1">Please try again or contact support</p>
          </div>
        )}

        {/* Tabs and Create Button */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('project')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  activeTab === 'project'
                    ? 'bg-white text-brand-blue shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 Project Templates
              </button>
              <button
                onClick={() => setActiveTab('task')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  activeTab === 'task'
                    ? 'bg-white text-brand-blue shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ✓ Task Templates
              </button>
            </div>

            <button
              onClick={() =>
                router.push(
                  `/projects-and-tasks/lecturer/templates/create/${activeTab}?courseId=${selectedCourse._id}`
                )
              }
              className="px-6 py-3 bg-brand-yellow hover:bg-amber-500 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-md hover:shadow-lg"
            >
              <Plus size={20} />
              Create {activeTab === 'project' ? 'Project' : 'Task'} Template
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          // Loading State
          <div className="flex flex-col items-center justify-center py-24">
            <Loader className="animate-spin text-brand-blue mb-4" size={48} />
            <p className="text-gray-600 font-medium">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <div className="mb-4">
              <div className="text-5xl mb-3">📦</div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {activeTab} templates yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first {activeTab} template to get started. Templates help you create consistent projects and tasks for your students.
            </p>
            <button
              onClick={() =>
                router.push(
                  `/projects-and-tasks/lecturer/templates/create/${activeTab}?courseId=${selectedCourse._id}`
                )
              }
              className="px-6 py-3 bg-brand-blue hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              <Plus size={18} className="inline mr-2" />
              Create First {activeTab === 'project' ? 'Project' : 'Task'} Template
            </button>
          </div>
        ) : (
          // Templates Grid
          <div className="space-y-4">
            <p className="text-sm text-gray-600 font-medium">
              {templates.length} {activeTab} template{templates.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid gap-4">
              {templates.map((template) => (
                <div
                  key={template._id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-brand-blue transition-all"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 truncate">
                        {template.projectName || '(Unnamed Template)'}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {template.description?.text || 'No description provided'}
                      </p>

                      {/* Metadata */}
                      <div className="flex gap-4 flex-wrap text-sm">
                        <span className="text-gray-500 flex items-center gap-1">
                          📅 {formatDate(template.deadlineDate)}
                        </span>
                        <span className="text-gray-500 flex items-center gap-1">
                          ⭐ {template.totalMarks || 0} marks
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-brand-blue font-medium text-xs">
                          {template.isSingleTaskTemplate ? '📝 Single Task' : '📋 Multi-Task'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() =>
                          router.push(
                            `/projects-and-tasks/lecturer/templates/${template._id}`
                          )
                        }
                        className="p-2.5 text-gray-600 hover:bg-blue-100 hover:text-brand-blue rounded-lg transition-colors"
                        title="View template details"
                      >
                        <Eye size={20} />
                      </button>
                      <button
                        onClick={() =>
                          router.push(
                            `/projects-and-tasks/lecturer/templates/edit/${template._id}?courseId=${selectedCourse._id}`
                          )
                        }
                        className="p-2.5 text-gray-600 hover:bg-blue-100 hover:text-brand-blue rounded-lg transition-colors"
                        title="Edit template"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(template._id)}
                        disabled={deleting === template._id}
                        className="p-2.5 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete template"
                      >
                        {deleting === template._id ? (
                          <Loader size={20} className="animate-spin" />
                        ) : (
                          <Trash2 size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}