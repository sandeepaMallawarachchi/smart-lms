// /components/projects-and-tasks/lecturer/view/ProjectDetailsCard.tsx

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Image, Download } from 'lucide-react';

interface Subtask {
  id: string;
  title: string;
  description?: string;
}

interface MainTask {
  id: string;
  title: string;
  description?: string;
  subtasks?: Subtask[];
}

interface Document {
  url: string;
  name: string;
  fileSize: number;
}

interface Project {
  _id: string;
  projectName: string;
  description: { html: string; text: string };
  projectType: 'group' | 'individual';
  deadlineDate: string;
  deadlineTime: string;
  specialNotes?: { html: string; text: string };
  templateDocuments: Document[];
  otherDocuments: Document[];
  images: Document[];
  mainTasks: MainTask[];
}

interface ProjectDetailsCardProps {
  project: Project;
}

export default function ProjectDetailsCard({ project }: ProjectDetailsCardProps) {
  const [expandedTasks, setExpandedTasks] = useState<{ [key: string]: boolean }>({});

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Safe check for subtasks
  const getSubtaskCount = (task: MainTask): number => {
    return (task.subtasks && Array.isArray(task.subtasks)) ? task.subtasks.length : 0;
  };

  const getSubtasks = (task: MainTask): Subtask[] => {
    return (task.subtasks && Array.isArray(task.subtasks)) ? task.subtasks : [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.projectName}</h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              {project.projectType === 'group' ? 'Group Project' : 'Individual'}
            </span>
          </div>
        </div>

        {project.description?.text && (
          <div className="mt-4">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700">{project.description.text}</p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Deadline:</span> {project.deadlineDate} at {project.deadlineTime}
          </p>
        </div>
      </div>

      {/* Special Notes */}
      {project.specialNotes?.text && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="font-semibold text-amber-900 mb-2">Special Notes</h3>
          <p className="text-amber-800">{project.specialNotes.text}</p>
        </div>
      )}

      {/* Main Tasks with Nested Subtasks */}
      {project.mainTasks && Array.isArray(project.mainTasks) && project.mainTasks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Main Tasks</h2>

          <div className="space-y-3">
            {project.mainTasks.map((task) => {
              const subtaskCount = getSubtaskCount(task);
              const subtasks = getSubtasks(task);

              return (
                <div key={task.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Main Task Header */}
                  <button
                    onClick={() =>
                      setExpandedTasks({
                        ...expandedTasks,
                        [task.id]: !expandedTasks[task.id],
                      })
                    }
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {expandedTasks[task.id] ? (
                        <ChevronDown size={20} className="text-gray-600" />
                      ) : (
                        <ChevronRight size={20} className="text-gray-600" />
                      )}
                      <span className="font-semibold text-gray-900">{task.title}</span>
                    </div>
                    {subtaskCount > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-auto">
                        {subtaskCount} subtasks
                      </span>
                    )}
                  </button>

                  {/* Expanded Content */}
                  {expandedTasks[task.id] && (
                    <div className="p-4 bg-white border-t border-gray-200 space-y-4">
                      {task.description && (
                        <div>
                          <p className="text-sm text-gray-700">{task.description}</p>
                        </div>
                      )}

                      {/* Subtasks */}
                      {subtaskCount > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-900">Subtasks:</h4>
                          <div className="space-y-1 pl-4">
                            {subtasks.map((subtask) => (
                              <div key={subtask.id} className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 bg-brand-blue rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                  <p className="text-sm text-gray-900">{subtask.title}</p>
                                  {subtask.description && (
                                    <p className="text-xs text-gray-600">{subtask.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Template Documents */}
      {project.templateDocuments && Array.isArray(project.templateDocuments) && project.templateDocuments.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} />
            Template Documents ({project.templateDocuments.length})
          </h2>

          <div className="space-y-2">
            {project.templateDocuments.map((doc) => (
              <a
                key={doc.url}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText size={18} className="text-gray-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
                  </div>
                </div>
                <Download size={18} className="text-gray-600 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Other Documents */}
      {project.otherDocuments && Array.isArray(project.otherDocuments) && project.otherDocuments.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} />
            Supporting Documents ({project.otherDocuments.length})
          </h2>

          <div className="space-y-2">
            {project.otherDocuments.map((doc) => (
              <a
                key={doc.url}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText size={18} className="text-gray-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
                  </div>
                </div>
                <Download size={18} className="text-gray-600 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Images */}
      {project.images && Array.isArray(project.images) && project.images.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Image size={20} />
            Images ({project.images.length})
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {project.images.map((img) => (
              <a
                key={img.url}
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative group overflow-hidden rounded-lg border border-gray-200"
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-40 object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Download size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}