'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, FileText, CheckCircle2, Loader } from 'lucide-react';

interface Project {
  _id: string;
  projectName: string;
  description: { html: string; text: string };
  projectType: 'group' | 'individual';
  deadlineDate: string;
  deadlineTime: string;
  courseId: string;
  lecturerId: string;
}

interface Task {
  _id: string;
  taskName: string;
  description: { html: string; text: string };
  deadlineDate?: string;
  deadlineTime?: string;
  courseId: string;
  lecturerId: string;
}

interface SelectedCourse {
  _id: string;
  courseName: string;
  courseCode: string;
  year: number;
  semester: number;
  credits: number;
}

const AllProjectsAndTasks = () => {
  const [activeTab, setActiveTab] = useState<'project' | 'task'>('project');
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lecturerId, setLecturerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Load selected course and lecturer ID from localStorage on mount
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
      setIsLoading(false);
    }
  }, []);

  // Listen for course selection changes from header
  useEffect(() => {
    const handleCourseSelected = (event: any) => {
      const course: SelectedCourse = event.detail;
      setSelectedCourse(course);
    };

    window.addEventListener('courseSelected', handleCourseSelected);
    return () => window.removeEventListener('courseSelected', handleCourseSelected);
  }, []);

  // Fetch projects when selected course or lecturer changes
  useEffect(() => {
    if (!selectedCourse?._id || !lecturerId) {
      setProjects([]);
      return;
    }

    const fetchProjects = async () => {
      setIsFetching(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(
          `/api/projects-and-tasks/lecturer/projects?courseId=${selectedCourse._id}&lecturerId=${lecturerId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProjects(data.data?.projects || []);
        } else {
          setProjects([]);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } finally {
        setIsFetching(false);
      }
    };

    fetchProjects();
  }, [selectedCourse?._id, lecturerId]);

  // Fetch tasks when selected course or lecturer changes
  useEffect(() => {
    if (!selectedCourse?._id || !lecturerId) {
      setTasks([]);
      return;
    }

    const fetchTasks = async () => {
      setIsFetching(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(
          `/api/projects-and-tasks/lecturer/tasks?courseId=${selectedCourse._id}&lecturerId=${lecturerId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setTasks(data.data?.tasks || []);
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setTasks([]);
      } finally {
        setIsFetching(false);
      }
    };

    fetchTasks();
  }, [selectedCourse?._id, lecturerId]);

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
        {/* Breadcrumb Navigation - HARDCODED WITH SELECTED COURSE */}
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

        {/* Page Header */}
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

        {/* Course Info Card */}
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

        {/* Tab Selector */}
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

        {/* Content Area */}
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
            // Projects Tab Content
            <>
              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 text-lg mb-2">No Projects Yet</p>
                  <p className="text-gray-500">Create a new project to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <div
                      key={project._id}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-1">{project.projectName}</h3>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              {project.projectType === 'group' ? 'Group Project' : 'Individual'}
                            </span>
                          </div>
                        </div>
                        <FileText className="text-gray-400" size={20} />
                      </div>

                      {project.description?.text && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description.text}</p>
                      )}

                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Deadline: <span className="font-semibold text-gray-700">{project.deadlineDate} {project.deadlineTime}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Tasks Tab Content
            <>
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 text-lg mb-2">No Tasks Yet</p>
                  <p className="text-gray-500">Create a new task to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task._id}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-2">{task.taskName}</h3>
                          {task.description?.text && (
                            <p className="text-sm text-gray-600 mb-4">{task.description.text}</p>
                          )}
                          {task.deadlineDate && (
                            <p className="text-xs text-gray-500">
                              Deadline: <span className="font-semibold text-gray-700">{task.deadlineDate} {task.deadlineTime || '23:59'}</span>
                            </p>
                          )}
                        </div>
                        <CheckCircle2 className="text-gray-400 flex-shrink-0 mt-1" size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllProjectsAndTasks;