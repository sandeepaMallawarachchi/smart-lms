// /projects-and-tasks/lecturer/create-projects-and-tasks/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, ChevronRight } from 'lucide-react';
import TabSelector from '@/components/projects-and-tasks/lecturer/createProjectTasks/TabSelector';
import ProjectCreationForm from '@/components/projects-and-tasks/lecturer/createProjectTasks/ProjectCreationForm';
import TaskCreationForm from '@/components/projects-and-tasks/lecturer/createProjectTasks/TaskCreationForm';

interface SelectedCourse {
  _id: string;
  courseName: string;
  courseCode: string;
  year: number;
  semester: number;
  credits: number;
}

export default function CreateProjectsAndTasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get from URL first, then fall back to localStorage
  const urlCourseId = searchParams.get('courseId');
  const urlCourseName = searchParams.get('courseName');
  
  const [courseId, setCourseId] = useState<string>('');
  const [courseName, setCourseName] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [activeTab, setActiveTab] = useState<'project' | 'task'>('project');
  const [lecturerId, setLecturerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage and sync with header course selection
  useEffect(() => {
    try {
      // Try URL params first
      if (urlCourseId && urlCourseName) {
        setCourseId(urlCourseId);
        setCourseName(decodeURIComponent(urlCourseName));
      } else {
        // Fall back to localStorage
        const savedCourse = localStorage.getItem('selectedCourse');
        if (savedCourse) {
          const parsed: SelectedCourse = JSON.parse(savedCourse);
          setCourseId(parsed._id);
          setCourseName(parsed.courseName);
          setSelectedCourse(parsed);
        }
      }

      // Always load lecturer ID from localStorage
      const savedLecturerId = localStorage.getItem('lecturerId');
      if (savedLecturerId) {
        setLecturerId(savedLecturerId);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setIsLoading(false);
    }
  }, [urlCourseId, urlCourseName]);

  // Listen for course selection changes from header
  useEffect(() => {
    const handleCourseSelected = (event: any) => {
      const course = event.detail as SelectedCourse;
      setCourseId(course._id);
      setCourseName(course.courseName);
      setSelectedCourse(course);
      
      // Update URL with new course params
      const newUrl = `/projects-and-tasks/lecturer/create-projects-and-tasks?courseId=${course._id}&courseName=${encodeURIComponent(course.courseName)}`;
      window.history.replaceState({}, '', newUrl);
    };

    window.addEventListener('courseSelected', handleCourseSelected);
    return () => window.removeEventListener('courseSelected', handleCourseSelected);
  }, []);

  const isFormDisabled = !courseId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          {/* Breadcrumb Navigation - INLINE */}
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <a
              href="/projects-and-tasks/lecturer/projects"
              className="text-brand-blue hover:underline font-medium"
            >
              Projects & Tasks
            </a>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="text-gray-700">
              {courseName ? decodeURIComponent(courseName) : 'Course'}
            </span>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="text-gray-900 font-semibold">Create Project and Task</span>
          </nav>

          {/* Page Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Project and Task
          </h1>
          <p className="text-gray-600">
            Create a new project or task for your course
          </p>
        </div>

        {/* Course Selection Alert */}
        {isFormDisabled && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold text-yellow-800">Select a Course</p>
              <p className="text-sm text-yellow-700">
                Please select a course from the dropdown at the top to enable the form
              </p>
            </div>
          </div>
        )}

        {/* Tab Selector */}
        <div className="bg-white rounded-t-lg border border-gray-200 border-b-0 p-6">
          <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-b-lg border border-gray-200 p-6">
          {!isFormDisabled ? (
            <>
              {/* Project Form */}
              {activeTab === 'project' && lecturerId && (
                <ProjectCreationForm
                  courseId={courseId}
                  lecturerId={lecturerId}
                  onSuccess={() => {
                    router.push(`/projects-and-tasks/lecturer/projects?courseId=${courseId}`);
                  }}
                />
              )}

              {/* Task Form */}
              {activeTab === 'task' && lecturerId && (
                <TaskCreationForm
                  courseId={courseId}
                  lecturerId={lecturerId}
                  onSuccess={() => {
                    router.push(`/projects-and-tasks/lecturer/projects?courseId=${courseId}`);
                  }}
                />
              )}

              {/* Loading State */}
              {!lecturerId && (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading form...</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 text-lg mb-2">
                No Course Selected
              </p>
              <p className="text-gray-500">
                Please select a course from the dropdown at the top to create a project or task
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}