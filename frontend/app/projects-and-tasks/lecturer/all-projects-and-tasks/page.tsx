// /projects-and-tasks/lecturer/all-projects-and-tasks/page.tsx
// FINAL VERSION - Deadline highlighting and task emphasis

'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, FileText, CheckCircle2, Loader, ChevronDown, ChevronUp, Download, Image as ImageIcon, Sparkles, Zap, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit } from 'lucide-react';
import EditProjectTaskModal from '@/components/projects-and-tasks/lecturer/view/EditProjectTaskModal';

// ============ INTERFACES ============
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

// ============ HELPER FUNCTIONS ============
const getDeadlineStatus = (deadlineDate: string, deadlineTime: string = '23:59') => {
  try {
    const deadline = new Date(`${deadlineDate}T${deadlineTime}`);
    const now = new Date();
    const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 0) {
      return { status: 'overdue', color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-300', textColor: 'text-red-900', icon: '⏰' };
    } else if (hoursUntil < 24) {
      return { status: 'urgent', color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-300', textColor: 'text-red-900', icon: '🔴' };
    } else if (hoursUntil < 72) {
      return { status: 'warning', color: 'orange', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', textColor: 'text-orange-900', icon: '🟠' };
    } else {
      return { status: 'ok', color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-300', textColor: 'text-green-900', icon: '🟢' };
    }
  } catch (error) {
    return { status: 'unknown', color: 'gray', bgColor: 'bg-gray-50', borderColor: 'border-gray-300', textColor: 'text-gray-900', icon: '⭕' };
  }
};

const getDeadlineStatusText = (deadlineDate: string, deadlineTime: string = '23:59') => {
  try {
    const deadline = new Date(`${deadlineDate}T${deadlineTime}`);
    const now = new Date();
    const msUntil = deadline.getTime() - now.getTime();
    const hoursUntil = msUntil / (1000 * 60 * 60);
    const daysUntil = Math.floor(hoursUntil / 24);

    if (msUntil < 0) {
      return `⏰ Overdue by ${Math.abs(daysUntil)} days`;
    } else if (hoursUntil < 1) {
      return `🔴 Due in less than 1 hour!`;
    } else if (hoursUntil < 24) {
      return `🔴 Due in ${Math.floor(hoursUntil)} hours!`;
    } else if (daysUntil === 0) {
      return `🔴 Due today!`;
    } else if (daysUntil === 1) {
      return `🟠 Due tomorrow`;
    } else if (daysUntil < 7) {
      return `🟠 Due in ${daysUntil} days`;
    } else {
      return `🟢 Due in ${daysUntil} days`;
    }
  } catch (error) {
    return '⭕ Invalid date';
  }
};

// ============ MAIN COMPONENT ============
export default function AllProjectsAndTasksPage() {
  const [activeTab, setActiveTab] = useState<'project' | 'task'>('project');
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lecturerId, setLecturerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<{ [key: string]: boolean }>({});
  const [expandedTasks, setExpandedTasks] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [editType, setEditType] = useState<'project' | 'task'>('project');

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

  const handleDocumentDownload = (url: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      window.open(url, '_blank');
    }
  };

  const handleImageError = (imageUrl: string) => {
    setImageErrors(prev => ({ ...prev, [imageUrl]: true }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 flex items-center justify-center">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-block">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-brand-blue to-brand-yellow flex items-center justify-center shadow-lg shadow-brand-blue/30">
              <Loader className="animate-spin text-white" size={32} />
            </div>
          </motion.div>
          <motion.p animate={{ opacity: [0.6, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-gray-600 font-semibold mt-4 text-center">
            Loading your content...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  const handleEditClick = (item: any, type: 'project' | 'task') => {
    setEditingData(item);
    setEditType(type);
    setEditModalOpen(true);
  };

 const handleSaveEdit = async (updatedData: any) => {
  try {
    // Validate we have the ID
    if (!editingData?._id) {
      throw new Error('Invalid item ID');
    }

    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    console.log('Saving edit for:', editType, editingData._id);
    console.log('Data to save:', updatedData);

    // Construct the correct endpoint
    const endpoint =
      editType === 'project'
        ? `/api/projects-and-tasks/lecturer/create-projects-and-tasks/project/${editingData._id}`
        : `/api/projects-and-tasks/lecturer/create-projects-and-tasks/task/${editingData._id}`;

    console.log('Endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response:', errorData);
      throw new Error(errorData.message || `Failed to update ${editType}`);
    }

    const result = await response.json();
    console.log('Update successful:', result);

    // Update local state with the returned data
    const updatedItem = result.data;

    if (editType === 'project') {
      setProjects(projects.map((p) =>
        p._id === editingData._id ? updatedItem : p
      ));
    } else {
      setTasks(tasks.map((t) =>
        t._id === editingData._id ? updatedItem : t
      ));
    }

    setEditModalOpen(false);
    setEditingData(null);
  } catch (error: any) {
    console.error('Edit error:', error);
    throw new Error(error.message || `Failed to update ${editType}`);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ y: [0, 30, 0] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-10 right-20 w-96 h-96 bg-gradient-to-r from-brand-blue/5 to-brand-yellow/5 rounded-full blur-3xl" />
        <motion.div animate={{ y: [0, -30, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 1 }} className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-r from-brand-yellow/5 to-brand-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10">
          <motion.nav className="flex items-center gap-2 text-sm text-gray-600 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <span className="text-gray-700 font-medium">Projects & Tasks</span>
            <motion.div animate={{ x: [0, 2, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ChevronRight size={16} className="text-gray-400" />
            </motion.div>
            <span className="text-gray-700">{selectedCourse ? selectedCourse.courseName : 'No Course Selected'}</span>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="text-gray-900 font-semibold">{activeTab === 'project' ? 'All Projects' : 'All Tasks'}</span>
          </motion.nav>

          {/* <motion.div className="flex items-center gap-4 mb-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
              {activeTab === 'project' ? <FileText size={36} className="text-brand-blue" /> : <CheckCircle2 size={36} className="text-brand-blue" />}
            </motion.div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-brand-blue to-brand-blue/70 bg-clip-text text-transparent">
              {activeTab === 'project' ? 'All Projects' : 'All Tasks'}
            </h1>
          </motion.div> */}

          <motion.p className="text-gray-600 text-lg ml-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {selectedCourse ? `Viewing ${activeTab === 'project' ? 'projects' : 'tasks'} for ${selectedCourse.courseName}` : 'Select a course to view content'}
          </motion.p>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl shadow-sm flex items-center gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-red-700 font-semibold">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Course Info Card */}
        {selectedCourse && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-gradient-to-r from-brand-blue/8 via-brand-yellow/3 to-brand-blue/8 rounded-xl border border-brand-blue/20 p-6 mb-8 shadow-sm hover:shadow-md transition-shadow" whileHover={{ y: -2 }}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedCourse.courseName}</h2>
                <p className="text-sm text-gray-600 mt-2">
                  {selectedCourse.courseCode} • Year {selectedCourse.year}, Semester {selectedCourse.semester} • {selectedCourse.credits} Credits
                </p>
              </div>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                <Sparkles size={28} className="text-brand-yellow" />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white/60 backdrop-blur-lg rounded-t-2xl border border-gray-200 border-b-0 p-6 shadow-lg">
          <div className="flex gap-8 border-b border-gray-200">
            <motion.button onClick={() => setActiveTab('project')} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className={`relative pb-4 font-semibold transition-all flex items-center gap-2.5 group ${activeTab === 'project' ? 'text-brand-blue' : 'text-gray-600 hover:text-gray-900'}`}>
              <motion.div animate={{ rotate: activeTab === 'project' ? 0 : -15 }} transition={{ duration: 0.3 }} className="group-hover:text-brand-blue transition-colors">
                <FileText size={20} strokeWidth={2.5} />
              </motion.div>
              <span>Projects</span>
              <motion.span animate={{ scale: activeTab === 'project' ? 1 : 0.8, opacity: activeTab === 'project' ? 1 : 0.6 }} className="bg-brand-blue/20 text-brand-blue text-xs font-bold px-2.5 py-1 rounded-full">
                {projects.length}
              </motion.span>
              {activeTab === 'project' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue to-brand-blue/50 rounded-full" transition={{ duration: 0.3 }} />}
            </motion.button>

            <motion.button onClick={() => setActiveTab('task')} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className={`relative pb-4 font-semibold transition-all flex items-center gap-2.5 group ${activeTab === 'task' ? 'text-brand-blue' : 'text-gray-600 hover:text-gray-900'}`}>
              <motion.div animate={{ rotate: activeTab === 'task' ? 0 : -15 }} transition={{ duration: 0.3 }} className="group-hover:text-brand-blue transition-colors">
                <CheckCircle2 size={20} strokeWidth={2.5} />
              </motion.div>
              <span>Tasks</span>
              <motion.span animate={{ scale: activeTab === 'task' ? 1 : 0.8, opacity: activeTab === 'task' ? 1 : 0.6 }} className="bg-brand-blue/20 text-brand-blue text-xs font-bold px-2.5 py-1 rounded-full">
                {tasks.length}
              </motion.span>
              {activeTab === 'task' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue to-brand-blue/50 rounded-full" transition={{ duration: 0.3 }} />}
            </motion.button>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white/80 backdrop-blur-sm rounded-b-2xl border border-gray-200 p-8 shadow-lg">
          <AnimatePresence mode="wait">
            {!selectedCourse ? (
              <motion.div key="no-course" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Sparkles size={56} className="text-gray-400 mx-auto mb-4" />
                </motion.div>
                <p className="text-gray-600 text-lg mb-2 font-semibold">No Course Selected</p>
                <p className="text-gray-500">Please select a course from the dropdown to view content</p>
              </motion.div>
            ) : isFetching ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-20">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="mr-4">
                  <Loader className="animate-spin text-brand-blue" size={32} />
                </motion.div>
                <p className="text-gray-600 font-semibold">Loading {activeTab === 'project' ? 'projects' : 'tasks'}...</p>
              </motion.div>
            ) : activeTab === 'project' ? (
              <motion.div key="projects" variants={containerVariants} initial="hidden" animate="visible">
                {projects.length === 0 ? (
                  <motion.div variants={itemVariants} className="text-center py-20">
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                      <FileText className="mx-auto mb-4 text-gray-400" size={56} />
                    </motion.div>
                    <p className="text-gray-600 text-lg mb-2 font-semibold">No Projects Yet</p>
                    <p className="text-gray-500">Create a new project to get started</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project) => {
                      const mainTasks = getMainTasks(project);
                      const templateDocs = getDocuments(project.templateDocuments);
                      const otherDocs = getDocuments(project.otherDocuments);
                      const images = getDocuments(project.images);
                      const isExpanded = expandedProjects[project._id];
                      const deadlineStatus = getDeadlineStatus(project.deadlineDate, project.deadlineTime);
                      const deadlineStatusText = getDeadlineStatusText(project.deadlineDate, project.deadlineTime);

                      return (
                        <motion.div
                          key={project._id}
                          variants={itemVariants}
                          whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.15)' }}
                          className={`bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all group ${deadlineStatus.color === 'red' ? 'border-red-300 shadow-lg shadow-red-200' : 'border-gray-200'
                            }`}
                        >
                          {/* Deadline Alert Banner for Urgent */}
                          {deadlineStatus.color === 'red' && (
                            <motion.div
                              animate={{ opacity: [1, 0.8, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 flex items-center gap-2"
                            >
                              <Clock size={16} />
                              <span className="font-semibold text-sm">{deadlineStatusText}</span>
                            </motion.div>
                          )}

                          {/* Project Header */}
                          <motion.div
                            className={`p-6 hover:bg-gradient-to-r hover:from-brand-blue/5 hover:to-transparent transition-all ${deadlineStatus.color === 'red' ? 'bg-red-50/30' : ''
                              }`}
                            onClick={() => setExpandedProjects({ ...expandedProjects, [project._id]: !isExpanded })}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                                    {isExpanded ? <ChevronDown size={22} className="text-brand-blue" /> : <ChevronUp size={22} className="text-gray-600 group-hover:text-brand-blue transition-colors" />}
                                  </motion.div>
                                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-brand-blue transition-colors">{project.projectName}</h3>
                                </div>
                                <div className="flex items-center gap-2 ml-9 flex-wrap gap-y-2">
                                  <motion.span
                                    whileHover={{ scale: 1.05 }}
                                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-brand-blue/20 to-brand-blue/10 text-brand-blue border border-brand-blue/20"
                                  >
                                    {project.projectType === 'group' ? '👥 Group' : '👤 Individual'}
                                  </motion.span>

                                  {/* Highlighted Deadline */}
                                  <motion.span
                                    whileHover={{ scale: 1.05 }}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 ${deadlineStatus.color === 'red'
                                      ? 'bg-red-100 border-red-400 text-red-900'
                                      : deadlineStatus.color === 'orange'
                                        ? 'bg-orange-100 border-orange-400 text-orange-900'
                                        : 'bg-green-100 border-green-400 text-green-900'
                                      }`}
                                  >
                                    📅 {project.deadlineDate}
                                  </motion.span>

                                  <span className="text-xs text-gray-500 font-medium">
                                    ⏰ {project.deadlineTime}
                                  </span>
                                </div>
                              </div>
                              <motion.div
                                animate={{ scale: 1 }}
                                whileHover={{ scale: 1.1 }}
                                className={`flex-shrink-0 transition-colors ${deadlineStatus.color === 'red' ? 'text-red-500' : 'text-gray-400 group-hover:text-brand-blue'
                                  }`}
                              >
                                <FileText size={24} />
                              </motion.div>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(project, 'project');
                                }}
                                className="p-1.5 hover:bg-brand-blue/10 rounded-lg transition-colors"
                                title="Edit project"
                              >
                                <Edit size={20} className="text-brand-blue hover:text-blue-700" />
                              </motion.button>
                            </div>

                            {project.description?.text && (
                              <p className="text-sm text-gray-600 mt-3 ml-9 line-clamp-2 group-hover:text-gray-700 transition-colors">{project.description.text}</p>
                            )}
                          </motion.div>

                          {/* Expanded Project Details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`border-t p-6 space-y-6 ${deadlineStatus.color === 'red'
                                  ? 'border-red-200 bg-gradient-to-br from-red-50/30 to-gray-50'
                                  : 'border-gray-200 bg-gradient-to-br from-gray-50/50 to-gray-50'
                                  }`}
                              >
                                {/* Full Description */}
                                {project.description?.text && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                                    <h4 className="font-semibold text-gray-900 mb-2">📝 Description</h4>
                                    <p className="text-sm text-gray-700 ml-6 whitespace-pre-wrap">{project.description.text}</p>
                                  </motion.div>
                                )}

                                {/* Main Tasks - Highlighted */}
                                {mainTasks.length > 0 && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 bg-blue-50/70 border-2 border-blue-300 rounded-lg">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-lg">
                                      <Zap size={20} className="text-blue-600" />
                                      Main Tasks ({mainTasks.length}) - Key Deliverables
                                    </h4>
                                    <div className="space-y-3 ml-6">
                                      {mainTasks.map((task, idx) => {
                                        const subtasks = getSubtasks(task);
                                        return (
                                          <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.12 + idx * 0.05 }}
                                            className="bg-white p-4 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors shadow-sm"
                                          >
                                            <p className="text-sm font-bold text-blue-900">📌 {task.title}</p>
                                            {task.description && <p className="text-xs text-gray-600 mt-1 italic">{task.description}</p>}
                                            {subtasks.length > 0 && (
                                              <div className="ml-4 space-y-1 mt-2 p-2 bg-blue-50 rounded">
                                                <p className="text-xs font-semibold text-blue-800 mb-1">Sub-components:</p>
                                                {subtasks.map((subtask, stIdx) => (
                                                  <p key={subtask.id} className="text-xs text-blue-700">
                                                    {String.fromCharCode(97 + stIdx)}) {subtask.title}
                                                  </p>
                                                ))}
                                              </div>
                                            )}
                                          </motion.div>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}

                                {/* Template Documents */}
                                {templateDocs.length > 0 && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                      <FileText size={18} className="text-blue-600" />
                                      Template Documents ({templateDocs.length})
                                    </h4>
                                    <div className="space-y-2 ml-6">
                                      {templateDocs.map((doc) => (
                                        <motion.button
                                          key={doc.url}
                                          whileHover={{ x: 4 }}
                                          onClick={() => handleDocumentDownload(doc.url, doc.name)}
                                          className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:border-brand-blue hover:bg-blue-100 transition-all text-left group"
                                        >
                                          <Download size={16} className="text-brand-blue flex-shrink-0 group-hover:scale-110 transition-transform" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
                                          </div>
                                          <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                                        </motion.button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}

                                {/* Other Documents */}
                                {otherDocs.length > 0 && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                      <FileText size={18} className="text-green-600" />
                                      Documents ({otherDocs.length})
                                    </h4>
                                    <div className="space-y-2 ml-6">
                                      {otherDocs.map((doc) => (
                                        <motion.button
                                          key={doc.url}
                                          whileHover={{ x: 4 }}
                                          onClick={() => handleDocumentDownload(doc.url, doc.name)}
                                          className="w-full flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg hover:border-brand-blue hover:bg-green-100 transition-all text-left group"
                                        >
                                          <Download size={16} className="text-green-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
                                          </div>
                                          <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                                        </motion.button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}

                                {/* Images */}
                                {images.length > 0 && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                      <ImageIcon size={18} className="text-purple-600" />
                                      Images ({images.length})
                                    </h4>
                                    <div className="grid grid-cols-4 md:grid-cols-5 gap-3 ml-6">
                                      {images.map((img) => (
                                        <motion.div key={img.url} whileHover={{ scale: 1.05 }} className="relative group cursor-pointer">
                                          {!imageErrors[img.url] ? (
                                            <>
                                              <img
                                                src={img.url}
                                                alt={img.name}
                                                onError={() => handleImageError(img.url)}
                                                className="w-full h-20 object-cover rounded-lg border border-gray-200 group-hover:border-brand-blue transition-all"
                                                onClick={() => window.open(img.url, '_blank')}
                                              />
                                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-all flex items-center justify-center">
                                                <Download size={12} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                              </div>
                                            </>
                                          ) : (
                                            <div className="w-full h-20 bg-gray-200 rounded-lg border border-gray-200 flex items-center justify-center flex-col gap-1">
                                              <ImageIcon size={14} className="text-gray-400" />
                                              <span className="text-xs text-gray-500">Failed</span>
                                            </div>
                                          )}
                                        </motion.div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}

                                {/* Special Notes */}
                                {project.specialNotes?.text && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-4 bg-yellow-50/70 border-2 border-yellow-300 rounded-lg ml-6">
                                    <h4 className="font-bold text-yellow-900 text-sm mb-2">⚠️ Special Notes - Important</h4>
                                    <p className="text-sm text-yellow-800 whitespace-pre-wrap">{project.specialNotes.text}</p>
                                  </motion.div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="tasks" variants={containerVariants} initial="hidden" animate="visible">
                {tasks.length === 0 ? (
                  <motion.div variants={itemVariants} className="text-center py-20">
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                      <CheckCircle2 className="mx-auto mb-4 text-gray-400" size={56} />
                    </motion.div>
                    <p className="text-gray-600 text-lg mb-2 font-semibold">No Tasks Yet</p>
                    <p className="text-gray-500">Create a new task to get started</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => {
                      const subtasks = getTaskSubtasks(task);
                      const templateDocs = getDocuments(task.templateDocuments);
                      const otherDocs = getDocuments(task.otherDocuments);
                      const images = getDocuments(task.images);
                      const isExpanded = expandedTasks[task._id];
                      const deadlineStatus = task.deadlineDate ? getDeadlineStatus(task.deadlineDate, task.deadlineTime) : null;
                      const deadlineStatusText = task.deadlineDate ? getDeadlineStatusText(task.deadlineDate, task.deadlineTime) : null;

                      return (
                        <motion.div
                          key={task._id}
                          variants={itemVariants}
                          whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.15)' }}
                          className={`bg-white border-2 rounded-xl cursor-pointer transition-all group ${deadlineStatus?.color === 'red' ? 'border-red-300 shadow-lg shadow-red-200' : 'border-gray-200'
                            }`}
                        >
                          {/* Deadline Alert Banner for Urgent */}
                          {deadlineStatus?.color === 'red' && (
                            <motion.div
                              animate={{ opacity: [1, 0.8, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 flex items-center gap-2"
                            >
                              <Clock size={16} />
                              <span className="font-semibold text-sm">{deadlineStatusText}</span>
                            </motion.div>
                          )}

                          {/* Task Header */}
                          <motion.div
                            className={`p-6 hover:bg-gradient-to-r hover:from-brand-blue/5 hover:to-transparent transition-all ${deadlineStatus?.color === 'red' ? 'bg-red-50/30' : ''
                              }`}
                            onClick={() => setExpandedTasks({ ...expandedTasks, [task._id]: !isExpanded })}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                                    {isExpanded ? <ChevronDown size={22} className="text-brand-blue" /> : <ChevronUp size={22} className="text-gray-600 group-hover:text-brand-blue transition-colors" />}
                                  </motion.div>
                                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-brand-blue transition-colors">{task.taskName}</h3>
                                </div>

                                {/* Highlighted Deadline for Tasks */}
                                {task.deadlineDate && (
                                  <motion.div className="ml-9 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 mb-2">
                                    <div
                                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 inline-flex items-center gap-1 ${deadlineStatus?.color === 'red'
                                        ? 'bg-red-100 border-red-400 text-red-900'
                                        : deadlineStatus?.color === 'orange'
                                          ? 'bg-orange-100 border-orange-400 text-orange-900'
                                          : 'bg-green-100 border-green-400 text-green-900'
                                        }`}
                                    >
                                      📅 {task.deadlineDate} ⏰ {task.deadlineTime}
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                              <motion.div
                                animate={{ scale: 1 }}
                                whileHover={{ scale: 1.1 }}
                                className={`flex-shrink-0 transition-colors ${deadlineStatus?.color === 'red' ? 'text-red-500' : 'text-gray-400 group-hover:text-brand-blue'
                                  }`}
                              >
                                <CheckCircle2 size={24} />
                              </motion.div>

                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(task, 'task');
                                }}
                                className="p-1.5 hover:bg-brand-blue/10 rounded-lg transition-colors"
                                title="Edit task"
                              >
                                <Edit size={20} className="text-brand-blue hover:text-blue-700" />
                              </motion.button>
                            </div>

                            {task.description?.text && (
                              <p className="text-sm text-gray-600 mt-3 ml-9 line-clamp-2 group-hover:text-gray-700 transition-colors">{task.description.text}</p>
                            )}
                          </motion.div>

                          {/* Expanded Task Details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`border-t p-6 space-y-6 ${deadlineStatus?.color === 'red'
                                  ? 'border-red-200 bg-gradient-to-br from-red-50/30 to-gray-50'
                                  : 'border-gray-200 bg-gradient-to-br from-gray-50/50 to-gray-50'
                                  }`}
                              >
                                {/* Full Description */}
                                {task.description?.text && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                                    <h4 className="font-semibold text-gray-900 mb-2">📝 Description</h4>
                                    <p className="text-sm text-gray-700 ml-6 whitespace-pre-wrap">{task.description.text}</p>
                                  </motion.div>
                                )}

                                {/* Deadline Highlight */}
                                {task.deadlineDate && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.08 }}
                                    className={`p-4 border-2 rounded-lg ml-6 ${deadlineStatus?.color === 'red'
                                      ? 'bg-red-100 border-red-400'
                                      : deadlineStatus?.color === 'orange'
                                        ? 'bg-orange-100 border-orange-400'
                                        : 'bg-green-100 border-green-400'
                                      }`}
                                  >
                                    <p
                                      className={`text-sm font-bold flex items-center gap-2 ${deadlineStatus?.color === 'red'
                                        ? 'text-red-900'
                                        : deadlineStatus?.color === 'orange'
                                          ? 'text-orange-900'
                                          : 'text-green-900'
                                        }`}
                                    >
                                      <Clock size={16} />
                                      {deadlineStatusText}
                                    </p>
                                  </motion.div>
                                )}

                                {/* Subtasks - Highlighted */}
                                {subtasks.length > 0 && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 bg-green-50 border-2 border-green-300 rounded-lg ml-6">
                                    <h4 className="font-bold text-gray-900 text-sm mb-2">✓ Subtasks ({subtasks.length}) - Required Steps</h4>
                                    <div className="space-y-1 ml-2">
                                      {subtasks.map((subtask, idx) => (
                                        <p key={subtask.id} className="text-sm text-green-900 font-medium">
                                          {idx + 1}. {subtask.title}
                                        </p>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}

                                {/* Template Documents */}
                                {templateDocs.length > 0 && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <FileText size={16} className="text-blue-600" />
                                      Templates ({templateDocs.length})
                                    </h4>
                                    <div className="space-y-2 ml-6">
                                      {templateDocs.map((doc) => (
                                        <motion.button
                                          key={doc.url}
                                          whileHover={{ x: 2 }}
                                          onClick={() => handleDocumentDownload(doc.url, doc.name)}
                                          className="flex items-center gap-2 text-sm text-brand-blue hover:text-blue-700 transition-colors text-left w-full p-2 rounded hover:bg-blue-50"
                                        >
                                          <Download size={14} />
                                          <span className="truncate">{doc.name}</span>
                                          <span className="text-xs text-gray-500 flex-shrink-0">({formatFileSize(doc.fileSize)})</span>
                                        </motion.button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}

                                {/* Other Documents */}
                                {otherDocs.length > 0 && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <FileText size={16} className="text-green-600" />
                                      Documents ({otherDocs.length})
                                    </h4>
                                    <div className="space-y-2 ml-6">
                                      {otherDocs.map((doc) => (
                                        <motion.button
                                          key={doc.url}
                                          whileHover={{ x: 2 }}
                                          onClick={() => handleDocumentDownload(doc.url, doc.name)}
                                          className="flex items-center gap-2 text-sm text-brand-blue hover:text-blue-700 transition-colors text-left w-full p-2 rounded hover:bg-blue-50"
                                        >
                                          <Download size={14} />
                                          <span className="truncate">{doc.name}</span>
                                          <span className="text-xs text-gray-500 flex-shrink-0">({formatFileSize(doc.fileSize)})</span>
                                        </motion.button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}

                                {/* Images */}
                                {images.length > 0 && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <ImageIcon size={16} className="text-purple-600" />
                                      Images ({images.length})
                                    </h4>
                                    <div className="flex gap-3 flex-wrap ml-6">
                                      {images.map((img) => (
                                        <motion.div key={img.url} whileHover={{ scale: 1.05 }} className="relative group">
                                          {!imageErrors[img.url] ? (
                                            <>
                                              <img
                                                src={img.url}
                                                alt={img.name}
                                                onError={() => handleImageError(img.url)}
                                                className="w-16 h-16 object-cover rounded border border-gray-300 group-hover:border-brand-blue transition-all cursor-pointer"
                                                onClick={() => window.open(img.url, '_blank')}
                                              />
                                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded transition-all flex items-center justify-center">
                                                <Download size={12} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                              </div>
                                            </>
                                          ) : (
                                            <div className="w-16 h-16 bg-gray-200 rounded border border-gray-300 flex items-center justify-center">
                                              <ImageIcon size={12} className="text-gray-400" />
                                            </div>
                                          )}
                                        </motion.div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}

                                {/* Special Notes */}
                                {task.specialNotes?.text && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg ml-6">
                                    <p className="text-xs font-bold text-yellow-900 mb-1">⚠️ Special Notes:</p>
                                    <p className="text-xs text-yellow-800 whitespace-pre-wrap">{task.specialNotes.text}</p>
                                  </motion.div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity }} className="mt-16 text-center">
          <p className="text-gray-400 text-sm font-medium">✨ Manage your course materials efficiently</p>
        </motion.div>
      </div>

      ───────────────────────────────────────
      <EditProjectTaskModal
        isOpen={editModalOpen}
        type={editType}
        data={editingData}
        onClose={() => {
          setEditModalOpen(false);
          setEditingData(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
}