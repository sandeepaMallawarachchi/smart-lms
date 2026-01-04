// /components/projects-and-tasks/lecturer/view/EditProjectTaskModal.tsx

'use client';

import React, { useState } from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import RichTextEditor from '../RichTextEditor';

interface EditProjectTaskModalProps {
  isOpen: boolean;
  type: 'project' | 'task';
  data: any;
  onClose: () => void;
  onSave: (updatedData: any) => Promise<void>;
}

export default function EditProjectTaskModal({
  isOpen,
  type,
  data,
  onClose,
  onSave,
}: EditProjectTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(data || {});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  React.useEffect(() => {
    if (data) {
      setFormData({ ...data });
      setErrors({});
    }
  }, [data, isOpen]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (type === 'project') {
      if (!formData.projectName?.trim()) {
        newErrors.projectName = 'Project name is required';
      }
      if (!formData.projectType || !['group', 'individual'].includes(formData.projectType)) {
        newErrors.projectType = 'Valid project type is required';
      }
      if (!formData.deadlineDate) {
        newErrors.deadlineDate = 'Deadline date is required';
      }
    } else {
      if (!formData.taskName?.trim()) {
        newErrors.taskName = 'Task name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix all errors');
      return;
    }

    setIsSubmitting(true);
    try {
      // Send only the fields that can be edited (not the ID or file data)
      const dataToSend = {
        projectName: type === 'project' ? formData.projectName : undefined,
        taskName: type === 'task' ? formData.taskName : undefined,
        description: formData.description || { html: '', text: '' },
        projectType: type === 'project' ? formData.projectType : undefined,
        deadlineDate: formData.deadlineDate || '',
        deadlineTime: formData.deadlineTime || '23:59',
        specialNotes: formData.specialNotes || { html: '', text: '' },
      };

      // Remove undefined values
      Object.keys(dataToSend).forEach(
        (key) => dataToSend[key] === undefined && delete dataToSend[key]
      );

      await onSave({
        ...formData,
        ...dataToSend,
      });

      toast.success(`${type === 'project' ? 'Project' : 'Task'} updated successfully!`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Failed to update ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && data && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-brand-blue/10 via-white to-brand-yellow/10 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit {type === 'project' ? 'Project' : 'Task'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} className="text-gray-600" />
                </motion.button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSave} className="p-6 space-y-6">
                {/* Error Summary */}
                {Object.keys(errors).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
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
                    {/* Project Name */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Project Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.projectName || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, projectName: e.target.value })
                        }
                        placeholder="Enter project name"
                        maxLength={200}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                      />
                      <div className="flex justify-between mt-2">
                        <p className="text-xs text-gray-500">Max 200 characters</p>
                        <p className="text-xs text-gray-400">{(formData.projectName || '').length}/200</p>
                      </div>
                    </motion.div>

                    {/* Description */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Description
                      </label>
                      <RichTextEditor
                        value={formData.description || { html: '', text: '' }}
                        onChange={(content) => setFormData({ ...formData, description: content })}
                        placeholder="Describe the project..."
                      />
                    </motion.div>

                    {/* Project Type */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Project Type <span className="text-red-600">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['group', 'individual'] as const).map((projectType) => (
                          <motion.button
                            key={projectType}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setFormData({ ...formData, projectType })}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${
                              formData.projectType === projectType
                                ? 'border-brand-blue bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <p className="font-semibold text-gray-900 capitalize text-sm">{projectType} Project</p>
                            <p className="text-xs text-gray-600">
                              {projectType === 'group' ? 'Team-based' : 'Individual'}
                            </p>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>

                    {/* Deadline */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Deadline <span className="text-red-600">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input
                            type="date"
                            value={formData.deadlineDate || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, deadlineDate: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                          />
                        </div>
                        <div>
                          <input
                            type="time"
                            value={formData.deadlineTime || '23:59'}
                            onChange={(e) =>
                              setFormData({ ...formData, deadlineTime: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Special Notes */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Special Notes (Optional)
                      </label>
                      <RichTextEditor
                        value={formData.specialNotes || { html: '', text: '' }}
                        onChange={(content) => setFormData({ ...formData, specialNotes: content })}
                        placeholder="Add any special instructions..."
                      />
                    </motion.div>
                  </>
                ) : (
                  <>
                    {/* Task Name */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Task Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.taskName || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, taskName: e.target.value })
                        }
                        placeholder="Enter task name"
                        maxLength={200}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                      />
                      <div className="flex justify-between mt-2">
                        <p className="text-xs text-gray-500">Max 200 characters</p>
                        <p className="text-xs text-gray-400">{(formData.taskName || '').length}/200</p>
                      </div>
                    </motion.div>

                    {/* Description */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Description
                      </label>
                      <RichTextEditor
                        value={formData.description || { html: '', text: '' }}
                        onChange={(content) => setFormData({ ...formData, description: content })}
                        placeholder="Describe the task..."
                      />
                    </motion.div>

                    {/* Deadline (Optional for tasks) */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Deadline (Optional)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input
                            type="date"
                            value={formData.deadlineDate || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, deadlineDate: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                          />
                        </div>
                        <div>
                          <input
                            type="time"
                            value={formData.deadlineTime || '23:59'}
                            onChange={(e) =>
                              setFormData({ ...formData, deadlineTime: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Special Notes */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Special Notes (Optional)
                      </label>
                      <RichTextEditor
                        value={formData.specialNotes || { html: '', text: '' }}
                        onChange={(content) => setFormData({ ...formData, specialNotes: content })}
                        placeholder="Add any special instructions..."
                      />
                    </motion.div>
                  </>
                )}

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-3 pt-6 border-t border-gray-200"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-brand-blue hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}