'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, FileText, CheckCircle2, Loader, ChevronDown, ChevronUp, Download, Image as ImageIcon } from 'lucide-react';

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
  courseId: string;
  lecturerId: string;
  specialNotes?: { html: string; text: string };
  templateDocuments?: Document[];
  otherDocuments?: Document[];
  images?: Document[];
  mainTasks?: MainTask[];
}

interface Task {
  _id: string;
  taskName: string;
  description: { html: string; text: string };
  deadlineDate?: string;
  deadlineTime?: string;
  courseId: string;
  lecturerId: string;
  specialNotes?: { html: string; text: string };
  templateDocuments?: Document[];
  otherDocuments?: Document[];
  images?: Document[];
  subtasks?: Subtask[];
}

interface SelectedCourse {
  _id: string;
  courseName: string;
  courseCode: string;
  year: number;
  semester: number;
  credits: number;
}

export default function AllProjectsAndTasksPage() {
  const [activeTab, setActiveTab] = useState<'project' | 'task'>('project');
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lecturerId, setLecturerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    try {
      const savedCourse = localStorage.getItem('selectedCourse');
      const savedLecturerId = localStorage.getItem('lecturerId');

      if (savedCourse) {
        const parsedCourse: SelectedCourse = JSON.parse(savedCourse);
        setSelectedCourse(parsedCourse);
      }

      if (savedLecturerId) {
        setLecturerId(savedLecturerId);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setError('Error loading course information');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleCourseSelected = (event: any) => {
      const course: SelectedCourse = event.detail;
      setSelectedCourse(course);
      setError(null);
    };

    window.addEventListener('courseSelected', handleCourseSelected);
    return () => window.removeEventListener('courseSelected', handleCourseSelected);
  }, []);

  useEffect(() => {
    if (!selectedCourse?._id || !lecturerId) {
      setProjects([]);
      return;
    }

    const fetchProjects = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Authentication required');
          setProjects([]);
          setIsFetching(false);
          return;
        }

        const response = await fetch(
          `/api/projects-and-tasks/lecturer/create-projects-and-tasks/project?courseId=${selectedCourse._id}&lecturerId=${lecturerId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch projects');
        }

        const data = await response.json();
        setProjects(data.data?.projects || []);
      } catch (error: any) {
        console.error('Error fetching projects:', error);
        setError(error.message || 'Failed to load projects');
        setProjects([]);
      } finally {
        setIsFetching(false);
      }
    };

    fetchProjects();
  }, [selectedCourse?._id, lecturerId]);

  useEffect(() => {
    if (!selectedCourse?._id || !lecturerId) {
      setTasks([]);
      return;
    }

    const fetchTasks = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Authentication required');
          setTasks([]);
          setIsFetching(false);
          return;
        }

        const response = await fetch(
          `/api/projects-and-tasks/lecturer/create-projects-and-tasks/task?courseId=${selectedCourse._id}&lecturerId=${lecturerId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch tasks');
        }

        const data = await response.json();
        setTasks(data.data?.tasks || []);
      } catch (error: any) {
        console.error('Error fetching tasks:', error);
        setError(error.message || 'Failed to load tasks');
        setTasks([]);
      } finally {
        setIsFetching(false);
      }
    };

    fetchTasks();
  }, [selectedCourse?._id, lecturerId]);

  const getMainTasks = (project: Project): MainTask[] => {
    return (project.mainTasks && Array.isArray(project.mainTasks)) ? project.mainTasks : [];
  };

  const getSubtasks = (task: MainTask): Subtask[] => {
    return (task.subtasks && Array.isArray(task.subtasks)) ? task.subtasks : [];
  };

  const getTaskSubtasks = (task: Task): Subtask[] => {
    return (task.subtasks && Array.isArray(task.subtasks)) ? task.subtasks : [];
  };

  const getDocuments = (docs: Document[] | undefined): Document[] => {
    return (docs && Array.isArray(docs)) ? docs : [];
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // ✅ FIXED: Proper document download handler
  const handleDocumentDownload = (url: string, fileName: string) => {
    try {
      // Create a temporary anchor element
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab if download fails
      window.open(url, '_blank');
    }
  };

  // ✅ FIXED: Image error handler
  const handleImageError = (imageUrl: string) => {
    setImageErrors(prev => ({ ...prev, [imageUrl]: true }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-8">
          <span className="text-gray-700 font-medium">Projects & Tasks</span>
          <ChevronRight size={16} className="text-gray-400" />
          <span className="text-gray-700">
            {selectedCourse ? selectedCourse.courseName : 'No Course Selected'}
          </span>
          <ChevronRight size={16} className="text-gray-400" />
          <span className="text-gray-900 font-semibold">
            {activeTab === 'project' ? 'All Projects' : 'All Tasks'}
          </span>
        </nav>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {activeTab === 'project' ? 'All Projects' : 'All Tasks'}
          </h1>
          <p className="text-gray-600">
            {selectedCourse
              ? `Viewing ${activeTab === 'project' ? 'projects' : 'tasks'} for ${selectedCourse.courseName}`
              : 'Select a course to view content'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {selectedCourse && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedCourse.courseName}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedCourse.courseCode} • Year {selectedCourse.year}, Semester {selectedCourse.semester} • {selectedCourse.credits} Credits
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-t-lg border border-gray-200 border-b-0 p-6 mb-0">
          <div className="flex gap-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('project')}
              className={`flex items-center gap-2 pb-4 font-medium transition-colors ${
                activeTab === 'project'
                  ? 'text-brand-blue border-b-2 border-brand-blue'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText size={18} />
              Projects ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab('task')}
              className={`flex items-center gap-2 pb-4 font-medium transition-colors ${
                activeTab === 'task'
                  ? 'text-brand-blue border-b-2 border-brand-blue'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle2 size={18} />
              Tasks ({tasks.length})
            </button>
          </div>
        </div>

        <div className="bg-white rounded-b-lg border border-gray-200 p-6">
          {!selectedCourse ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-2">No Course Selected</p>
              <p className="text-gray-500">Please select a course from the dropdown at the top to view content</p>
            </div>
          ) : isFetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-brand-blue mr-2" size={24} />
              <p className="text-gray-600">Loading {activeTab === 'project' ? 'projects' : 'tasks'}...</p>
            </div>
          ) : activeTab === 'project' ? (
            <>
              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 text-lg mb-2">No Projects Yet</p>
                  <p className="text-gray-500">Create a new project to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => {
                    const mainTasks = getMainTasks(project);
                    const templateDocs = getDocuments(project.templateDocuments);
                    const otherDocs = getDocuments(project.otherDocuments);
                    const images = getDocuments(project.images);

                    return (
                      <div
                        key={project._id}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div
                          className="p-6 cursor-pointer hover:bg-gray-50"
                          onClick={() =>
                            setExpandedProjects({
                              ...expandedProjects,
                              [project._id]: !expandedProjects[project._id],
                            })
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {expandedProjects[project._id] ? (
                                  <ChevronDown size={20} className="text-gray-600" />
                                ) : (
                                  <ChevronUp size={20} className="text-gray-600" />
                                )}
                                <h3 className="font-bold text-gray-900 text-lg">{project.projectName}</h3>
                              </div>
                              <div className="flex items-center gap-2 ml-7">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                  {project.projectType === 'group' ? 'Group Project' : 'Individual'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Deadline: {project.deadlineDate} {project.deadlineTime}
                                </span>
                              </div>
                            </div>
                            <FileText className="text-gray-400" size={20} />
                          </div>

                          {project.description?.text && (
                            <p className="text-sm text-gray-600 mt-3 ml-7 line-clamp-2">{project.description.text}</p>
                          )}
                        </div>

                        {expandedProjects[project._id] && (
                          <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-4">
                            {mainTasks.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Main Tasks ({mainTasks.length})</h4>
                                <div className="space-y-2 ml-4">
                                  {mainTasks.map((task) => {
                                    const subtasks = getSubtasks(task);
                                    return (
                                      <div key={task.id}>
                                        <p className="text-sm font-medium text-gray-700">• {task.title}</p>
                                        {subtasks.length > 0 && (
                                          <div className="ml-4 space-y-1 mt-1">
                                            {subtasks.map((subtask) => (
                                              <p key={subtask.id} className="text-xs text-gray-600">
                                                ◦ {subtask.title}
                                              </p>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {templateDocs.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Template Documents</h4>
                                <div className="space-y-2 ml-4">
                                  {templateDocs.map((doc) => (
                                    <button
                                      key={doc.url}
                                      onClick={() => handleDocumentDownload(doc.url, doc.name)}
                                      className="flex items-center gap-2 text-sm text-brand-blue hover:underline hover:text-blue-700 transition-colors text-left"
                                    >
                                      <Download size={14} />
                                      <span>{doc.name}</span>
                                      <span className="text-xs text-gray-500">({formatFileSize(doc.fileSize)})</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {otherDocs.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Documents</h4>
                                <div className="space-y-2 ml-4">
                                  {otherDocs.map((doc) => (
                                    <button
                                      key={doc.url}
                                      onClick={() => handleDocumentDownload(doc.url, doc.name)}
                                      className="flex items-center gap-2 text-sm text-brand-blue hover:underline hover:text-blue-700 transition-colors text-left"
                                    >
                                      <Download size={14} />
                                      <span>{doc.name}</span>
                                      <span className="text-xs text-gray-500">({formatFileSize(doc.fileSize)})</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {images.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Images ({images.length})</h4>
                                <div className="grid grid-cols-3 gap-2 ml-4">
                                  {images.map((img) => (
                                    <div key={img.url} className="relative group">
                                      {!imageErrors[img.url] ? (
                                        <img
                                          src={img.url}
                                          alt={img.name}
                                          onError={() => handleImageError(img.url)}
                                          className="w-20 h-20 object-cover rounded border border-gray-300 hover:opacity-75 transition-opacity cursor-pointer"
                                          onClick={() => window.open(img.url, '_blank')}
                                        />
                                      ) : (
                                        <div className="w-20 h-20 bg-gray-200 rounded border border-gray-300 flex items-center justify-center flex-col gap-1">
                                          <ImageIcon size={16} className="text-gray-400" />
                                          <span className="text-xs text-gray-500">Failed</span>
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors flex items-center justify-center">
                                        <Download size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {project.specialNotes?.text && (
                              <div className="pt-4 border-t border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-2">Special Notes</h4>
                                <p className="text-sm text-gray-700 ml-4">{project.specialNotes.text}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 text-lg mb-2">No Tasks Yet</p>
                  <p className="text-gray-500">Create a new task to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => {
                    const subtasks = getTaskSubtasks(task);
                    const templateDocs = getDocuments(task.templateDocuments);
                    const otherDocs = getDocuments(task.otherDocuments);
                    const images = getDocuments(task.images);

                    return (
                      <div
                        key={task._id}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-gray-900 text-lg">{task.taskName}</h3>
                          <CheckCircle2 className="text-gray-400 flex-shrink-0" size={20} />
                        </div>

                        {task.description?.text && (
                          <p className="text-sm text-gray-600 mb-3">{task.description.text}</p>
                        )}

                        <div className="space-y-2 mb-3">
                          {task.deadlineDate && (
                            <p className="text-xs text-gray-500">
                              <span className="font-semibold">Deadline:</span> {task.deadlineDate} {task.deadlineTime || '23:59'}
                            </p>
                          )}
                        </div>

                        {subtasks.length > 0 && (
                          <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                            <h4 className="font-semibold text-gray-900 text-sm mb-2">Subtasks ({subtasks.length})</h4>
                            <div className="space-y-1 ml-4">
                              {subtasks.map((subtask) => (
                                <p key={subtask.id} className="text-sm text-gray-700">
                                  ✓ {subtask.title}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {(templateDocs.length > 0 || otherDocs.length > 0 || images.length > 0) && (
                          <div className="pt-3 border-t border-gray-200 space-y-2">
                            {templateDocs.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">Templates:</p>
                                <div className="space-y-1 ml-2">
                                  {templateDocs.map((doc) => (
                                    <button
                                      key={doc.url}
                                      onClick={() => handleDocumentDownload(doc.url, doc.name)}
                                      className="flex items-center gap-1 text-xs text-brand-blue hover:underline transition-colors text-left"
                                    >
                                      <Download size={12} />
                                      {doc.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {otherDocs.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">Documents:</p>
                                <div className="space-y-1 ml-2">
                                  {otherDocs.map((doc) => (
                                    <button
                                      key={doc.url}
                                      onClick={() => handleDocumentDownload(doc.url, doc.name)}
                                      className="flex items-center gap-1 text-xs text-brand-blue hover:underline transition-colors text-left"
                                    >
                                      <Download size={12} />
                                      {doc.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {images.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">Images ({images.length})</p>
                                <div className="flex gap-2">
                                  {images.map((img) => (
                                    <div key={img.url} className="relative group">
                                      {!imageErrors[img.url] ? (
                                        <img
                                          src={img.url}
                                          alt={img.name}
                                          onError={() => handleImageError(img.url)}
                                          className="w-12 h-12 object-cover rounded border border-gray-300 hover:opacity-75 transition-opacity cursor-pointer"
                                          onClick={() => window.open(img.url, '_blank')}
                                        />
                                      ) : (
                                        <div className="w-12 h-12 bg-gray-200 rounded border border-gray-300 flex items-center justify-center">
                                          <ImageIcon size={12} className="text-gray-400" />
                                        </div>
                                      )}
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}