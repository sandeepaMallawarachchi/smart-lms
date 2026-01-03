// /projects-and-tasks/lecturer/create-projects-and-tasks/page.tsx
// Replace with this enhanced version

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, ChevronRight, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const urlCourseId = searchParams.get('courseId');
  const urlCourseName = searchParams.get('courseName');

  const [courseId, setCourseId] = useState<string>('');
  const [courseName, setCourseName] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [activeTab, setActiveTab] = useState<'project' | 'task'>('project');
  const [lecturerId, setLecturerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      if (urlCourseId && urlCourseName) {
        setCourseId(urlCourseId);
        setCourseName(decodeURIComponent(urlCourseName));
      } else {
        const savedCourse = localStorage.getItem('selectedCourse');
        if (savedCourse) {
          const parsed: SelectedCourse = JSON.parse(savedCourse);
          setCourseId(parsed._id);
          setCourseName(parsed.courseName);
          setSelectedCourse(parsed);
        }
      }

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

  useEffect(() => {
    const handleCourseSelected = (event: any) => {
      const course = event.detail as SelectedCourse;
      setCourseId(course._id);
      setCourseName(course.courseName);
      setSelectedCourse(course);

      const newUrl = `/projects-and-tasks/lecturer/create-projects-and-tasks?courseId=${course._id}&courseName=${encodeURIComponent(course.courseName)}`;
      window.history.replaceState({}, '', newUrl);
    };

    window.addEventListener('courseSelected', handleCourseSelected);
    return () => window.removeEventListener('courseSelected', handleCourseSelected);
  }, []);

  const isFormDisabled = !courseId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-brand-blue to-brand-yellow flex items-center justify-center shadow-lg shadow-brand-blue/30">
              <Sparkles size={32} className="text-white" />
            </div>
          </motion.div>
          <motion.p
            animate={{ opacity: [0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-gray-600 font-semibold mt-4 text-center"
          >
            Loading your workspace...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-r from-brand-blue/5 to-brand-yellow/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, delay: 1 }}
          className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-r from-brand-yellow/5 to-brand-blue/5 rounded-full blur-3xl"
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Header Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-8"
        >
          {/* Back Button with Animation */}
          <motion.button
            onClick={() => router.back()}
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 text-gray-600 hover:text-brand-blue mb-6 transition-colors font-medium group"
          >
            <motion.div
              animate={{ x: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ArrowLeft size={20} className="group-hover:text-brand-blue" />
            </motion.div>
            Back
          </motion.button>

          {/* Breadcrumb Navigation */}
          <motion.nav
            variants={itemVariants}
            className="flex items-center gap-2 text-sm text-gray-600 mb-8"
          >
            <motion.a
              href="/projects-and-tasks/lecturer/all-projects-and-tasks"
              whileHover={{ color: '#3B82F6', scale: 1.05 }}
              className="text-brand-blue hover:underline font-semibold transition-colors"
            >
              Projects & Tasks
            </motion.a>
            <motion.div
              animate={{ x: [0, 2, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ChevronRight size={16} className="text-gray-400" />
            </motion.div>
            <span className="text-gray-700 font-medium">
              {courseName ? decodeURIComponent(courseName) : 'Course'}
            </span>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="text-gray-900 font-semibold">Create New</span>
          </motion.nav>

          {/* Page Title with Gradient */}
          <motion.div
            variants={itemVariants}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <Zap size={32} className="text-brand-yellow" />
              </motion.div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-brand-blue via-brand-blue to-brand-blue/70 bg-clip-text text-transparent">
                Create Project or Task
              </h1>
            </div>
            <p className="text-gray-600 text-lg ml-11">
              Add engaging learning materials and assignments to your course
            </p>
          </motion.div>
        </motion.div>

        {/* Course Selection Alert */}
        <AnimatePresence>
          {isFormDisabled && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mb-8 p-5 bg-gradient-to-r from-yellow-50 via-orange-50 to-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex-shrink-0 mt-0.5"
              >
                <AlertCircle className="text-yellow-600" size={22} />
              </motion.div>
              <div>
                <p className="font-semibold text-yellow-800 text-lg">Select a Course First</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Please select a course from the dropdown at the top to enable the form
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Container */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          transition={{ delay: 0.1 }}
          className="space-y-0 mb-12"
        >
          {/* Tab Selector */}
          <motion.div
            className="bg-white/60 backdrop-blur-lg rounded-t-2xl border border-gray-200 border-b-0 p-6 shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.1)' }}
          >
            <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
          </motion.div>

          {/* Form Content Container */}
          <motion.div
            className="bg-white/80 backdrop-blur-sm rounded-b-2xl border border-gray-200 p-8 shadow-lg min-h-[600px]"
            whileHover={{ boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.08)' }}
          >
            <AnimatePresence mode="wait">
              {!isFormDisabled ? (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Project Form */}
                  {activeTab === 'project' && lecturerId && (
                    <ProjectCreationForm
                      courseId={courseId}
                      lecturerId={lecturerId}
                      onSuccess={() => {
                        router.push(`/projects-and-tasks/lecturer/all-projects-and-tasks`);
                      }}
                    />
                  )}

                  {/* Task Form */}
                  {activeTab === 'task' && lecturerId && (
                    <TaskCreationForm
                      courseId={courseId}
                      lecturerId={lecturerId}
                      onSuccess={() => {
                        router.push(`/projects-and-tasks/lecturer/all-projects-and-tasks`);
                      }}
                    />
                  )}

                  {/* Loading State */}
                  {!lecturerId && (
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-center py-16"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Sparkles size={48} className="text-brand-blue mx-auto mb-4" />
                      </motion.div>
                      <p className="text-gray-600 font-semibold">Loading form...</p>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="no-course"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <AlertCircle className="mx-auto mb-4 text-gray-400" size={56} />
                  </motion.div>
                  <p className="text-gray-600 text-xl mb-2 font-semibold">
                    No Course Selected
                  </p>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Please select a course from the dropdown at the top to create a project or task
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Footer Message */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="mt-12 text-center"
        >
          <p className="text-gray-400 text-sm font-medium">
            ✨ Create engaging learning experiences for your students
          </p>
        </motion.div>
      </div>
    </div>
  );
}