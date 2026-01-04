'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  X,
  FileIcon,
  Download,
} from 'lucide-react';

interface Subtask {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
}

interface MainTask {
  id: string;
  title: string;
  description?: string;
  subtasks?: Subtask[];
  completed?: boolean;
}

interface Document {
  url: string;
  name: string;
  fileSize: number;
}

interface Course {
  _id: string;
  courseName: string;
  courseCode: string;
  credits: number;
  year: number;
  semester: number;
  specializations?: string[];
}

interface Project {
  _id: string;
  projectName: string;
  description: { html: string; text: string };
  projectType: 'group' | 'individual';
  deadlineDate: string;
  deadlineTime: string;
  specialNotes?: { html: string; text: string };
  templateDocuments?: Document[];
  otherDocuments?: Document[];
  images?: Document[];
  mainTasks?: MainTask[];
  course: Course;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  _id: string;
  taskName: string;
  description: { html: string; text: string };
  deadlineDate?: string;
  deadlineTime?: string;
  specialNotes?: { html: string; text: string };
  templateDocuments?: Document[];
  otherDocuments?: Document[];
  images?: Document[];
  subtasks?: Subtask[];
  course: Course;
  createdAt: string;
  updatedAt: string;
}

interface KanbanItem {
  _id: string;
  name: string;
  type: 'project' | 'task';
  item: Project | Task;
  status: 'todo' | 'inprogress' | 'done';
}

const getDeadlineStatus = (deadlineDate: string, deadlineTime: string = '23:59') => {
  try {
    const deadline = new Date(`${deadlineDate}T${deadlineTime}`);
    const now = new Date();
    const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 0) {
      return { status: 'overdue', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    } else if (hoursUntil < 24) {
      return { status: 'urgent', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    } else if (hoursUntil < 72) {
      return { status: 'warning', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    } else {
      return { status: 'ok', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    }
  } catch {
    return { status: 'unknown', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
  }
};

const getDeadlineText = (deadlineDate: string, deadlineTime: string = '23:59') => {
  try {
    const deadline = new Date(`${deadlineDate}T${deadlineTime}`);
    const now = new Date();
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`;
    } else if (daysUntil === 0) {
      return 'Due today';
    } else if (daysUntil === 1) {
      return 'Due tomorrow';
    } else {
      return `${daysUntil} days left`;
    }
  } catch {
    return 'Invalid date';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

interface StudentDetailPanelProps {
  item: KanbanItem | null;
  onClose: () => void;
  onTaskUpdate?: (projectId: string, mainTasks: MainTask[]) => void;
  onSubtaskUpdate?: (taskId: string, subtasks: Subtask[]) => void;
}

export default function StudentDetailPanel({ item, onClose, onTaskUpdate, onSubtaskUpdate }: StudentDetailPanelProps) {
  const [mainTasks, setMainTasks] = useState<MainTask[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!item) return;

    const fetchProgressData = async () => {
      const isProject = item.type === 'project';
      const token = localStorage.getItem('authToken');

      try {
        if (isProject) {
          const project = item.item as Project;
          const progressRes = await fetch(
            `/api/projects-and-tasks/student/project-progress?projectId=${project._id}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (progressRes.ok) {
            const progressData = await progressRes.json();
            setMainTasks(progressData.data.progress.mainTasks || project.mainTasks || []);
          } else {
            setMainTasks(project.mainTasks || []);
          }
        } else {
          const task = item.item as Task;
          const progressRes = await fetch(
            `/api/projects-and-tasks/student/task-progress?taskId=${task._id}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (progressRes.ok) {
            const progressData = await progressRes.json();
            setSubtasks(progressData.data.progress.subtasks || task.subtasks || []);
          } else {
            setSubtasks(task.subtasks || []);
          }
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
        const isProject = item.type === 'project';
        if (isProject) {
          const project = item.item as Project;
          setMainTasks(project.mainTasks || []);
        } else {
          const task = item.item as Task;
          setSubtasks(task.subtasks || []);
        }
      }
    };

    fetchProgressData();
  }, [item]);

  if (!item) return null;

  const isProject = item.type === 'project';
  const project = isProject ? (item.item as Project) : null;
  const task = !isProject ? (item.item as Task) : null;

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = 'fixed bottom-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg z-[60] animate-pulse';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const handleDownload = (url: string, name: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      window.open(url, '_blank');
    }
  };

  const handleMainTaskToggle = (taskId: string) => {
    if (item.status === 'todo') {
      showToast('Move to In Progress to check tasks');
      return;
    }

    const updated = mainTasks.map((t) => {
      if (t.id === taskId) {
        const isChecking = !t.completed;
        return {
          ...t,
          completed: isChecking,
          subtasks: t.subtasks?.map((st) => ({
            ...st,
            completed: isChecking,
          })),
        };
      }
      return t;
    });
    setMainTasks(updated);
    saveProjectProgress(updated);
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    if (item.status === 'todo') {
      showToast('Move to In Progress to check tasks');
      return;
    }

    const updated = subtasks.map((st) => {
      if (st.id === subtaskId) {
        return { ...st, completed: !st.completed };
      }
      return st;
    });
    setSubtasks(updated);
    saveTaskProgress(updated);
  };

  const handleSubtaskInMainTask = (mainTaskId: string, subtaskId: string) => {
    if (item.status === 'todo') {
      showToast('Move to In Progress to check tasks');
      return;
    }

    const updated = mainTasks.map((t) => {
      if (t.id === mainTaskId) {
        const updatedSubtasks = t.subtasks?.map((st) => {
          if (st.id === subtaskId) {
            return { ...st, completed: !st.completed };
          }
          return st;
        }) || [];

        const allSubtasksCompleted = updatedSubtasks.every((st) => st.completed);

        return {
          ...t,
          subtasks: updatedSubtasks,
          completed: allSubtasksCompleted && updatedSubtasks.length > 0,
        };
      }
      return t;
    });
    setMainTasks(updated);
    saveProjectProgress(updated);
  };

  const saveProjectProgress = async (tasks: MainTask[]) => {
    if (!project) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const allTasksCompleted = tasks.every((t) => t.completed);
      const newStatus = allTasksCompleted && tasks.length > 0 ? 'done' : 'inprogress';

      const response = await fetch('/api/projects-and-tasks/student/project-progress', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project._id,
          status: newStatus,
          mainTasks: tasks,
        }),
      });

      if (response.ok) {
        if (onTaskUpdate) {
          onTaskUpdate(project._id, tasks);
        }
        if (item && newStatus !== item.status) {
          item.status = newStatus;
        }
      }
    } catch (error) {
      console.error('Error saving project progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const saveTaskProgress = async (subs: Subtask[]) => {
    if (!task) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const allSubtasksCompleted = subs.every((st) => st.completed);
      const newStatus = allSubtasksCompleted && subs.length > 0 ? 'done' : 'inprogress';

      const response = await fetch('/api/projects-and-tasks/student/task-progress', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task._id,
          status: newStatus,
          subtasks: subs,
        }),
      });

      if (response.ok) {
        if (onSubtaskUpdate) {
          onSubtaskUpdate(task._id, subs);
        }
        if (item && newStatus !== item.status) {
          item.status = newStatus;
        }
      }
    } catch (error) {
      console.error('Error saving task progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ x: 500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 500, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-gradient-to-r from-brand-blue to-brand-blue/80 text-white p-6 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-blue-100 mb-1">
                  {isProject ? '📋 PROJECT' : '✓ TASK'}
                </p>
                <h2 className="text-xl font-bold truncate">{item.name}</h2>
              </div>
              <motion.button
                whileHover={{ rotate: 90 }}
                onClick={onClose}
                className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
                disabled={isSaving}
              >
                <X size={24} />
              </motion.button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-semibold mb-2">ASSIGNED COURSE</p>
                <p className="font-semibold text-gray-900">{item.item.course.courseName}</p>
                <p className="text-sm text-gray-600">
                  {item.item.course.courseCode} • Year {item.item.course.year}, Semester {item.item.course.semester}
                </p>
              </div>

              {item.item.deadlineDate && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-amber-600" />
                    <p className="text-sm font-semibold text-amber-900">DEADLINE</p>
                  </div>
                  <p className="font-semibold text-amber-900">
                    {item.item.deadlineDate} • {item.item.deadlineTime}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {getDeadlineText(item.item.deadlineDate, item.item.deadlineTime)}
                  </p>
                </div>
              )}

              {isProject && project && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">PROJECT TYPE</p>
                  <p className="text-sm font-medium text-gray-900">
                    {project.projectType === 'group' ? '👥 Group Project' : '👤 Individual Project'}
                  </p>
                </div>
              )}

              {item.item.description?.text && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">DESCRIPTION</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {item.item.description.text}
                  </p>
                </div>
              )}

              {isProject && mainTasks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-3">MAIN TASKS ({mainTasks.length})</p>
                  <div className="space-y-3">
                    {mainTasks.map((mainTask, idx) => (
                      <div key={mainTask.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={mainTask.completed || false}
                            onChange={() => handleMainTaskToggle(mainTask.id)}
                            disabled={isSaving || item.status === 'todo'}
                            className={`mt-1 w-5 h-5 accent-green-600 ${item.status === 'todo' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                          />
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${mainTask.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {idx + 1}. {mainTask.title}
                            </p>
                            {mainTask.description && (
                              <p className="text-xs text-gray-600 mt-1">{mainTask.description}</p>
                            )}
                            {mainTask.subtasks && mainTask.subtasks.length > 0 && (
                              <div className="mt-3 pl-3 border-l-2 border-blue-300 space-y-2">
                                {mainTask.subtasks.map((subtask) => (
                                  <div key={subtask.id} className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      checked={subtask.completed || false}
                                      onChange={() => handleSubtaskInMainTask(mainTask.id, subtask.id)}
                                      disabled={isSaving || item.status === 'todo'}
                                      className={`mt-0.5 w-4 h-4 accent-green-600 ${item.status === 'todo' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                    />
                                    <p className={`text-xs ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                      • {subtask.title}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isProject && subtasks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-3">SUBTASKS ({subtasks.length})</p>
                  <div className="space-y-2">
                    {subtasks.map((subtask, idx) => (
                      <div key={subtask.id} className="flex gap-3 items-start p-3 bg-green-50 border border-green-200 rounded-lg">
                        <input
                          type="checkbox"
                          checked={subtask.completed || false}
                          onChange={() => handleSubtaskToggle(subtask.id)}
                          disabled={isSaving || item.status === 'todo'}
                          className={`mt-0.5 w-5 h-5 accent-green-600 ${item.status === 'todo' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        />
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {idx + 1}. {subtask.title}
                          </p>
                          {subtask.description && (
                            <p className={`text-xs mt-1 ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-600'}`}>
                              {subtask.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {item.item.templateDocuments && item.item.templateDocuments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-3">TEMPLATE DOCUMENTS ({item.item.templateDocuments.length})</p>
                  <div className="space-y-2">
                    {item.item.templateDocuments.map((doc) => (
                      <motion.button
                        key={doc.url}
                        whileHover={{ x: 4 }}
                        onClick={() => handleDownload(doc.url, doc.name)}
                        className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <FileIcon size={16} className="text-blue-600 shrink-0" />
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
                        </div>
                        <Download size={16} className="text-blue-600 shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {item.item.otherDocuments && item.item.otherDocuments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-3">DOCUMENTS ({item.item.otherDocuments.length})</p>
                  <div className="space-y-2">
                    {item.item.otherDocuments.map((doc) => (
                      <motion.button
                        key={doc.url}
                        whileHover={{ x: 4 }}
                        onClick={() => handleDownload(doc.url, doc.name)}
                        className="w-full flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <FileIcon size={16} className="text-green-600 shrink-0" />
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
                        </div>
                        <Download size={16} className="text-green-600 shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {item.item.images && item.item.images.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-3">IMAGES ({item.item.images.length})</p>
                  <div className="grid grid-cols-3 gap-3">
                    {item.item.images.map((img) => (
                      <motion.a
                        key={img.url}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.05 }}
                        className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:border-brand-blue transition-colors"
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-image.png';
                          }}
                        />
                      </motion.a>
                    ))}
                  </div>
                </div>
              )}

              {item.item.specialNotes?.text && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <p className="text-xs font-semibold text-yellow-900 mb-2">⚠️ SPECIAL NOTES</p>
                  <p className="text-sm text-yellow-800 whitespace-pre-wrap leading-relaxed">
                    {item.item.specialNotes.text}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}