// /components/projects-and-tasks/lecturer/templates/TasksForm.tsx

'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import FormSection from './FormSection';

interface Task {
  id: string;
  title: string;
  description: string;
}

interface TasksFormProps {
  isSingleTaskTemplate: boolean;
  mainTasks: Task[];
  subtasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onSubtasksChange: (subtasks: Task[]) => void;
}

export default function TasksForm({
  isSingleTaskTemplate,
  mainTasks,
  subtasks,
  onTasksChange,
  onSubtasksChange,
}: TasksFormProps) {
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newSubtaskName, setNewSubtaskName] = useState('');

  // Add main task
  const handleAddMainTask = () => {
    if (!newTaskName.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskName,
      description: '',
    };

    const updatedTasks = [...mainTasks, newTask];
    onTasksChange(updatedTasks);
    setNewTaskName('');
  };

  // Remove main task
  const handleRemoveMainTask = (id: string) => {
    const updatedTasks = mainTasks.filter((task) => task.id !== id);
    onTasksChange(updatedTasks);
  };

  // Add subtask
  const handleAddSubtask = () => {
    if (!newSubtaskName.trim()) return;

    const newSubtask: Task = {
      id: Date.now().toString(),
      title: newSubtaskName,
      description: '',
    };

    const updatedSubtasks = [...subtasks, newSubtask];
    onSubtasksChange(updatedSubtasks);
    setNewSubtaskName('');
  };

  // Remove subtask
  const handleRemoveSubtask = (id: string) => {
    const updatedSubtasks = subtasks.filter((task) => task.id !== id);
    onSubtasksChange(updatedSubtasks);
  };

  // Toggle task expansion
  const toggleExpanded = (id: string) => {
    setExpandedTasks((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (isSingleTaskTemplate) {
    return (
      <FormSection title="Subtasks" icon="✓">
        <div className="space-y-4">
          {/* Subtasks List */}
          {subtasks.length > 0 && (
            <div className="space-y-2 mb-4">
              {subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{subtask.title}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveSubtask(subtask.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete subtask"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Subtask Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtaskName}
              onChange={(e) => setNewSubtaskName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddSubtask();
                }
              }}
              placeholder="Enter subtask name..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
            <button
              onClick={handleAddSubtask}
              className="px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus size={18} />
              Add
            </button>
          </div>

          {subtasks.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No subtasks added yet
            </p>
          )}
        </div>
      </FormSection>
    );
  }

  // Multi-task template
  return (
    <FormSection title="Main Tasks & Subtasks" icon="📋">
      <div className="space-y-4">
        {/* Main Tasks List */}
        {mainTasks.length > 0 && (
          <div className="space-y-2 mb-4">
            {mainTasks.map((task) => (
              <div key={task.id}>
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => toggleExpanded(task.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {expandedTasks.includes(task.id) ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>
                    <GripVertical size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{task.title}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveMainTask(task.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete task"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Main Task Input */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddMainTask();
              }
            }}
            placeholder="Enter main task name..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
          />
          <button
            onClick={handleAddMainTask}
            className="px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add Task
          </button>
        </div>

        {mainTasks.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No main tasks added yet
          </p>
        )}
      </div>
    </FormSection>
  );
}