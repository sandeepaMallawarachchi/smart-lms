'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskProgress {
  mainTaskId?: string;
  mainTaskTitle?: string;
  subtasks?: Subtask[];
  completed: boolean;
  totalTasks?: number;
  completedCount?: number;
}

interface NotificationCardProps {
  notification: {
    _id: string;
    title: string;
    message: string;
    description: string;
    reminderPercentage?: number;
    taskProgress?: TaskProgress[];
    isRead: boolean;
    sentAt: string;
    type: string;
  };
  onMarkRead: (id: string) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'project_reminder':
    case 'task_reminder':
      return <Clock className="text-blue-600" size={24} />;
    case 'deadline_warning':
      return <AlertCircle className="text-orange-600" size={24} />;
    case 'overdue':
      return <AlertCircle className="text-red-600" size={24} />;
    case 'progress_update':
      return <CheckCircle2 className="text-green-600" size={24} />;
    default:
      return <FileText className="text-gray-600" size={24} />;
  }
};

const getColorClass = (type: string, isRead: boolean) => {
  const baseClass = isRead ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200';

  switch (type) {
    case 'deadline_warning':
      return `${!isRead ? 'bg-orange-50 border-orange-200' : baseClass}`;
    case 'overdue':
      return `${!isRead ? 'bg-red-50 border-red-200' : baseClass}`;
    case 'progress_update':
      return `${!isRead ? 'bg-green-50 border-green-200' : baseClass}`;
    default:
      return baseClass;
  }
};

export default function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const sentDate = new Date(notification.sentAt);
  const timeAgo = getTimeAgo(sentDate);

  const totalTasks = notification.taskProgress?.reduce((sum, task) => sum + (task.totalTasks || 0), 0) || 0;
  const completedTasks = notification.taskProgress?.reduce((sum, task) => sum + (task.completedCount || 0), 0) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border-l-4 ${getColorClass(notification.type, notification.isRead)} rounded-lg p-4 cursor-pointer transition-all hover:shadow-md`}
      onClick={() => !notification.isRead && onMarkRead(notification._id)}
    >
      <div className="flex gap-4">
        <div className="shrink-0">{getIcon(notification.type)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-bold text-gray-900">{notification.title}</p>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              <p className="text-xs text-gray-500 mt-2">{notification.description}</p>
            </div>
            {!notification.isRead && (
              <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
            )}
          </div>

          {notification.taskProgress && notification.taskProgress.length > 0 && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                📊 Progress: {completedTasks}/{totalTasks} Tasks Completed
              </p>

              {notification.taskProgress.map((task, idx) => (
                <div key={idx} className="mb-3 last:mb-0">
                  {task.mainTaskTitle && (
                    <div className="mb-1">
                      <p className={`text-xs font-semibold ${task.completed ? 'text-green-700' : 'text-gray-700'}`}>
                        {task.completed ? '✅' : '⭕'} {task.mainTaskTitle}
                      </p>
                      <p className="text-xs text-gray-600 ml-4">
                        {task.completedCount}/{task.totalTasks} subtasks completed
                      </p>
                    </div>
                  )}

                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="ml-4 space-y-1">
                      {task.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2">
                          {subtask.completed ? (
                            <CheckCircle2 size={14} className="text-green-600" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-gray-400" />
                          )}
                          <p className={`text-xs ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                            {subtask.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {!task.mainTaskTitle && task.subtasks && (
                    <div className="space-y-1">
                      {task.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2">
                          {subtask.completed ? (
                            <CheckCircle2 size={14} className="text-green-600" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-gray-400" />
                          )}
                          <p className={`text-xs ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                            {subtask.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">{timeAgo}</p>
        </div>
      </div>
    </motion.div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}