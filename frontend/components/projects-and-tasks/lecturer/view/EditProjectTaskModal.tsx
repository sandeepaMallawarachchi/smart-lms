'use client';

import React, { useState } from 'react';
import { AlertCircle, Loader, Plus, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import RichTextEditor from '../RichTextEditor';

interface EditProjectTaskModalProps {
  isOpen: boolean;
  type: 'project' | 'task';
  data: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (updatedData: Record<string, unknown>) => Promise<void>;
}

interface Subtask {
  id: string;
  title: string;
  description?: string;
  marks?: number;
}

interface MainTask {
  id: string;
  title: string;
  description?: string;
  marks?: number;
  subtasks?: Subtask[];
}

interface GroupStudent {
  _id: string;
  name: string;
  studentIdNumber: string;
}

interface CourseGroup {
  _id: string;
  groupName: string;
  studentIds: string[];
  students?: GroupStudent[];
}

type EditorContent = { html: string; text: string };
interface FormDataState {
  projectName?: string;
  taskName?: string;
  description?: EditorContent;
  projectType?: 'group' | 'individual' | '';
  assignedGroupIds?: string[];
  deadlineDate?: string;
  deadlineTime?: string;
  specialNotes?: EditorContent;
  mainTasks?: MainTask[];
  subtasks?: Subtask[];
  courseId?: string;
  [key: string]: unknown;
}

function normalizeProjectData(input: Record<string, unknown>) {
  return {
    ...input,
    description: input?.description || { html: '', text: '' },
    specialNotes: input?.specialNotes || { html: '', text: '' },
    mainTasks: Array.isArray(input?.mainTasks) ? input.mainTasks : [],
    assignedGroupIds: Array.isArray(input?.assignedGroupIds) ? input.assignedGroupIds : [],
  };
}

function normalizeTaskData(input: Record<string, unknown>) {
  return {
    ...input,
    description: input?.description || { html: '', text: '' },
    specialNotes: input?.specialNotes || { html: '', text: '' },
    subtasks: Array.isArray(input?.subtasks) ? input.subtasks : [],
  };
}

export default function EditProjectTaskModal({
  isOpen,
  type,
  data,
  onClose,
  onSave,
}: EditProjectTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormDataState>(data || {});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [newMainTaskTitle, setNewMainTaskTitle] = useState('');
  const [newMainTaskMarks, setNewMainTaskMarks] = useState('');
  const [newProjectSubtaskTitle, setNewProjectSubtaskTitle] = useState<Record<string, string>>({});
  const [newProjectSubtaskMarks, setNewProjectSubtaskMarks] = useState<Record<string, string>>({});
  const [newTaskSubtaskTitle, setNewTaskSubtaskTitle] = useState('');
  const [newTaskSubtaskMarks, setNewTaskSubtaskMarks] = useState('');

  React.useEffect(() => {
    if (data) {
      setFormData(type === 'project' ? normalizeProjectData(data) : normalizeTaskData(data));
      setErrors({});
      setNewMainTaskTitle('');
      setNewMainTaskMarks('');
      setNewProjectSubtaskTitle({});
      setNewProjectSubtaskMarks({});
      setNewTaskSubtaskTitle('');
      setNewTaskSubtaskMarks('');
    }
  }, [data, isOpen, type]);

  React.useEffect(() => {
    const fetchCourseGroups = async () => {
      if (!isOpen || type !== 'project' || !data?.courseId) return;
      setIsLoadingGroups(true);
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/projects-and-tasks/lecturer/course-groups?courseId=${data.courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch groups');
        const result = await response.json();
        setCourseGroups(result?.data?.groups || []);
      } catch (error) {
        console.error('Error fetching groups for edit:', error);
        setCourseGroups([]);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    fetchCourseGroups();
  }, [isOpen, type, data?.courseId]);

  const getProjectMainMarksTotal = () =>
    (formData.mainTasks || []).reduce((sum: number, task: MainTask) => sum + Number(task.marks || 0), 0);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (type === 'project') {
      if (!formData.projectName?.trim()) newErrors.projectName = 'Project name is required';
      if (!formData.projectType || !['group', 'individual'].includes(formData.projectType)) {
        newErrors.projectType = 'Valid project type is required';
      }
      if (formData.projectType === 'group' && (!Array.isArray(formData.assignedGroupIds) || formData.assignedGroupIds.length === 0)) {
        newErrors.assignedGroupIds = 'Select at least one group for a group project';
      }
      if (!formData.deadlineDate) newErrors.deadlineDate = 'Deadline date is required';

      const totalMainMarks = getProjectMainMarksTotal();
      if (totalMainMarks > 100) newErrors.mainTaskMarks = 'Total main task marks cannot exceed 100';
      for (const task of formData.mainTasks || []) {
        const mainMarks = Number(task.marks || 0);
        if (!Number.isFinite(mainMarks) || mainMarks < 0 || mainMarks > 100) {
          newErrors.mainTaskMarks = 'Each main task mark must be between 0 and 100';
          break;
        }
        const subtaskTotal = (task.subtasks || []).reduce(
          (sum: number, subtask: Subtask) => sum + Number(subtask.marks || 0),
          0
        );
        if (subtaskTotal > mainMarks) {
          newErrors.mainTaskMarks = `Subtask marks exceed main task marks for "${task.title}"`;
          break;
        }
      }
    } else {
      if (!formData.taskName?.trim()) newErrors.taskName = 'Task name is required';

      const subtaskTotal = (formData.subtasks || []).reduce(
        (sum: number, subtask: Subtask) => sum + Number(subtask.marks || 0),
        0
      );
      if (subtaskTotal > 100) newErrors.subtaskMarks = 'Total subtask marks cannot exceed 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addMainTask = () => {
    if (!newMainTaskTitle.trim()) {
      toast.error('Enter main task title');
      return;
    }
    const marks = Number(newMainTaskMarks);
    if (!Number.isFinite(marks) || marks < 0) {
      toast.error('Enter valid marks for main task');
      return;
    }
    if (getProjectMainMarksTotal() + marks > 100) {
      toast.error('Total main task marks cannot exceed 100');
      return;
    }
    setFormData((prev: FormDataState) => ({
      ...prev,
      mainTasks: [
        ...(prev.mainTasks || []),
        { id: `${Date.now()}`, title: newMainTaskTitle.trim(), description: '', marks, subtasks: [] },
      ],
    }));
    setNewMainTaskTitle('');
    setNewMainTaskMarks('');
  };

  const removeMainTask = (taskId: string) => {
    setFormData((prev: FormDataState) => ({
      ...prev,
      mainTasks: (prev.mainTasks || []).filter((task: MainTask) => task.id !== taskId),
    }));
  };

  const updateMainTaskField = (taskId: string, field: 'title' | 'marks', value: string) => {
    setFormData((prev: FormDataState) => ({
      ...prev,
      mainTasks: (prev.mainTasks || []).map((task: MainTask) =>
        task.id === taskId
          ? {
              ...task,
              [field]: field === 'marks' ? Number(value || 0) : value,
            }
          : task
      ),
    }));
  };

  const addProjectSubtask = (taskId: string) => {
    const title = (newProjectSubtaskTitle[taskId] || '').trim();
    const marks = Number(newProjectSubtaskMarks[taskId] || 0);
    if (!title) {
      toast.error('Enter subtask title');
      return;
    }
    if (!Number.isFinite(marks) || marks < 0) {
      toast.error('Enter valid subtask marks');
      return;
    }
    const task = (formData.mainTasks || []).find((row: MainTask) => row.id === taskId);
    const allowedMarks = Number(task?.marks || 0);
    const existingMarks = (task?.subtasks || []).reduce(
      (sum: number, subtask: Subtask) => sum + Number(subtask.marks || 0),
      0
    );
    if (existingMarks + marks > allowedMarks) {
      toast.error('Subtask marks cannot exceed main task marks');
      return;
    }

    setFormData((prev: FormDataState) => ({
      ...prev,
      mainTasks: (prev.mainTasks || []).map((row: MainTask) =>
        row.id === taskId
          ? {
              ...row,
              subtasks: [
                ...(row.subtasks || []),
                { id: `${Date.now()}`, title, description: '', marks },
              ],
            }
          : row
      ),
    }));
    setNewProjectSubtaskTitle((prev) => ({ ...prev, [taskId]: '' }));
    setNewProjectSubtaskMarks((prev) => ({ ...prev, [taskId]: '' }));
  };

  const removeProjectSubtask = (taskId: string, subtaskId: string) => {
    setFormData((prev: FormDataState) => ({
      ...prev,
      mainTasks: (prev.mainTasks || []).map((row: MainTask) =>
        row.id === taskId
          ? {
              ...row,
              subtasks: (row.subtasks || []).filter((subtask: Subtask) => subtask.id !== subtaskId),
            }
          : row
      ),
    }));
  };

  const updateProjectSubtaskField = (taskId: string, subtaskId: string, field: 'title' | 'marks', value: string) => {
    setFormData((prev: FormDataState) => ({
      ...prev,
      mainTasks: (prev.mainTasks || []).map((row: MainTask) =>
        row.id === taskId
          ? {
              ...row,
              subtasks: (row.subtasks || []).map((subtask: Subtask) =>
                subtask.id === subtaskId
                  ? {
                      ...subtask,
                      [field]: field === 'marks' ? Number(value || 0) : value,
                    }
                  : subtask
              ),
            }
          : row
      ),
    }));
  };

  const addTaskSubtask = () => {
    const title = newTaskSubtaskTitle.trim();
    const marks = Number(newTaskSubtaskMarks || 0);
    if (!title) {
      toast.error('Enter subtask title');
      return;
    }
    if (!Number.isFinite(marks) || marks < 0) {
      toast.error('Enter valid marks for subtask');
      return;
    }
    const total = (formData.subtasks || []).reduce(
      (sum: number, subtask: Subtask) => sum + Number(subtask.marks || 0),
      0
    );
    if (total + marks > 100) {
      toast.error('Total subtask marks cannot exceed 100');
      return;
    }
    setFormData((prev: FormDataState) => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), { id: `${Date.now()}`, title, description: '', marks }],
    }));
    setNewTaskSubtaskTitle('');
    setNewTaskSubtaskMarks('');
  };

  const updateTaskSubtaskField = (subtaskId: string, field: 'title' | 'marks', value: string) => {
    setFormData((prev: FormDataState) => ({
      ...prev,
      subtasks: (prev.subtasks || []).map((subtask: Subtask) =>
        subtask.id === subtaskId
          ? {
              ...subtask,
              [field]: field === 'marks' ? Number(value || 0) : value,
            }
          : subtask
      ),
    }));
  };

  const removeTaskSubtask = (subtaskId: string) => {
    setFormData((prev: FormDataState) => ({
      ...prev,
      subtasks: (prev.subtasks || []).filter((subtask: Subtask) => subtask.id !== subtaskId),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix all errors');
      return;
    }

    setIsSubmitting(true);
    try {
      const dataToSend: Record<string, unknown> = {
        projectName: type === 'project' ? formData.projectName : undefined,
        taskName: type === 'task' ? formData.taskName : undefined,
        description: formData.description || { html: '', text: '' },
        projectType: type === 'project' ? formData.projectType : undefined,
        assignedGroupIds: type === 'project' ? (formData.assignedGroupIds || []) : undefined,
        deadlineDate: formData.deadlineDate || '',
        deadlineTime: formData.deadlineTime || '23:59',
        specialNotes: formData.specialNotes || { html: '', text: '' },
        mainTasks: type === 'project' ? (formData.mainTasks || []) : undefined,
        subtasks: type === 'task' ? (formData.subtasks || []) : undefined,
      };
      Object.keys(dataToSend).forEach((key) => dataToSend[key] === undefined && delete dataToSend[key]);

      await onSave({ ...formData, ...dataToSend });
      toast.success(`${type === 'project' ? 'Project' : 'Task'} updated successfully!`);
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to update ${type}`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const taskSubtaskTotal = (formData.subtasks || []).reduce(
    (sum: number, subtask: Subtask) => sum + Number(subtask.marks || 0),
    0
  );

  return (
    <AnimatePresence>
      {isOpen && data && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-brand-blue/10 via-white to-brand-yellow/10 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Edit {type === 'project' ? 'Project' : 'Task'}</h2>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={24} className="text-gray-600" />
                </motion.button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                {Object.keys(errors).length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-semibold flex items-center gap-2 mb-2">
                      <AlertCircle size={20} />
                      Please fix the following errors:
                    </p>
                    <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                      {Object.values(errors).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {type === 'project' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Project Name <span className="text-red-600">*</span></label>
                      <input
                        type="text"
                        value={formData.projectName || ''}
                        onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                        maxLength={200}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                      <RichTextEditor
                        value={formData.description || { html: '', text: '' }}
                        onChange={(content) => setFormData({ ...formData, description: content })}
                        placeholder="Describe the project..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Project Type <span className="text-red-600">*</span></label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['group', 'individual'] as const).map((projectType) => (
                          <button
                            key={projectType}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                projectType,
                                assignedGroupIds: projectType === 'group' ? (formData.assignedGroupIds || []) : [],
                              })
                            }
                            className={`p-3 rounded-lg border-2 transition-all text-left ${formData.projectType === projectType ? 'border-brand-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            <p className="font-semibold text-gray-900 capitalize text-sm">{projectType} Project</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {formData.projectType === 'group' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">Assign Groups <span className="text-red-600">*</span></label>
                        {isLoadingGroups ? (
                          <p className="text-sm text-gray-500">Loading groups...</p>
                        ) : (
                          <div className="space-y-2">
                            {courseGroups.map((group) => {
                              const isChecked = (formData.assignedGroupIds || []).includes(group._id);
                              return (
                                <label key={group._id} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${isChecked ? 'border-brand-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      setFormData((prev: FormDataState) => ({
                                        ...prev,
                                        assignedGroupIds: isChecked
                                          ? (prev.assignedGroupIds || []).filter((id: string) => id !== group._id)
                                          : [...(prev.assignedGroupIds || []), group._id],
                                      }))
                                    }
                                    className="mt-1 h-4 w-4 accent-brand-blue"
                                  />
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{group.groupName}</p>
                                    <p className="text-xs text-gray-600">{(group.students || []).length} students</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Deadline <span className="text-red-600">*</span></label>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="date"
                          value={formData.deadlineDate || ''}
                          onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                        />
                        <input
                          type="time"
                          value={formData.deadlineTime || '23:59'}
                          onChange={(e) => setFormData({ ...formData, deadlineTime: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Special Notes (Optional)</label>
                      <RichTextEditor
                        value={formData.specialNotes || { html: '', text: '' }}
                        onChange={(content) => setFormData({ ...formData, specialNotes: content })}
                        placeholder="Add any special instructions..."
                      />
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Main Tasks & Subtasks</h3>
                        <span className="text-xs font-semibold text-gray-700">
                          Total Main Marks: {getProjectMainMarksTotal()}/100
                        </span>
                      </div>

                      {(formData.mainTasks || []).map((task: MainTask) => (
                        <div key={task.id} className="rounded-lg border border-gray-200 p-3 space-y-3">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <input
                              type="text"
                              value={task.title || ''}
                              onChange={(e) => updateMainTaskField(task.id, 'title', e.target.value)}
                              placeholder="Main task title"
                              className="col-span-8 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              value={Number(task.marks || 0)}
                              onChange={(e) => updateMainTaskField(task.id, 'marks', e.target.value)}
                              placeholder="Marks"
                              className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <button type="button" onClick={() => removeMainTask(task.id)} className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded">
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                            {(task.subtasks || []).map((subtask: Subtask) => (
                              <div key={subtask.id} className="grid grid-cols-12 gap-2 items-center">
                                <input
                                  type="text"
                                  value={subtask.title || ''}
                                  onChange={(e) => updateProjectSubtaskField(task.id, subtask.id, 'title', e.target.value)}
                                  placeholder="Subtask title"
                                  className="col-span-8 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  max={Number(task.marks || 0)}
                                  step="0.5"
                                  value={Number(subtask.marks || 0)}
                                  onChange={(e) => updateProjectSubtaskField(task.id, subtask.id, 'marks', e.target.value)}
                                  placeholder="Marks"
                                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                                <button type="button" onClick={() => removeProjectSubtask(task.id, subtask.id)} className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}

                            <div className="grid grid-cols-12 gap-2 items-center">
                              <input
                                type="text"
                                value={newProjectSubtaskTitle[task.id] || ''}
                                onChange={(e) => setNewProjectSubtaskTitle((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                placeholder="New subtask title"
                                className="col-span-8 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <input
                                type="number"
                                min={0}
                                max={Number(task.marks || 0)}
                                step="0.5"
                                value={newProjectSubtaskMarks[task.id] || ''}
                                onChange={(e) => setNewProjectSubtaskMarks((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                placeholder="Marks"
                                className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <button type="button" onClick={() => addProjectSubtask(task.id)} className="col-span-1 p-2 text-brand-blue hover:bg-blue-50 rounded">
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={newMainTaskTitle}
                          onChange={(e) => setNewMainTaskTitle(e.target.value)}
                          placeholder="New main task title"
                          className="col-span-8 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={newMainTaskMarks}
                          onChange={(e) => setNewMainTaskMarks(e.target.value)}
                          placeholder="Marks"
                          className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button type="button" onClick={addMainTask} className="col-span-1 p-2 text-brand-blue hover:bg-blue-50 rounded">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Task Name <span className="text-red-600">*</span></label>
                      <input
                        type="text"
                        value={formData.taskName || ''}
                        onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                        maxLength={200}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                      <RichTextEditor
                        value={formData.description || { html: '', text: '' }}
                        onChange={(content) => setFormData({ ...formData, description: content })}
                        placeholder="Describe the task..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Deadline (Optional)</label>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="date"
                          value={formData.deadlineDate || ''}
                          onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                        />
                        <input
                          type="time"
                          value={formData.deadlineTime || '23:59'}
                          onChange={(e) => setFormData({ ...formData, deadlineTime: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Special Notes (Optional)</label>
                      <RichTextEditor
                        value={formData.specialNotes || { html: '', text: '' }}
                        onChange={(content) => setFormData({ ...formData, specialNotes: content })}
                        placeholder="Add any special instructions..."
                      />
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Subtasks</h3>
                        <span className="text-xs font-semibold text-gray-700">Total Subtask Marks: {taskSubtaskTotal}/100</span>
                      </div>
                      {(formData.subtasks || []).map((subtask: Subtask) => (
                        <div key={subtask.id} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            value={subtask.title || ''}
                            onChange={(e) => updateTaskSubtaskField(subtask.id, 'title', e.target.value)}
                            placeholder="Subtask title"
                            className="col-span-8 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={Number(subtask.marks || 0)}
                            onChange={(e) => updateTaskSubtaskField(subtask.id, 'marks', e.target.value)}
                            placeholder="Marks"
                            className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <button type="button" onClick={() => removeTaskSubtask(subtask.id)} className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}

                      <div className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={newTaskSubtaskTitle}
                          onChange={(e) => setNewTaskSubtaskTitle(e.target.value)}
                          placeholder="New subtask title"
                          className="col-span-8 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={newTaskSubtaskMarks}
                          onChange={(e) => setNewTaskSubtaskMarks(e.target.value)}
                          placeholder="Marks"
                          className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button type="button" onClick={addTaskSubtask} className="col-span-1 p-2 text-brand-blue hover:bg-blue-50 rounded">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-brand-blue hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 disabled:cursor-not-allowed">
                    {isSubmitting ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
