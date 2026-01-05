'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import NotificationCard from './NotificationCard';

interface TaskProgress {
  mainTaskId?: string;
  mainTaskTitle?: string;
  subtasks?: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  completed: boolean;
  totalTasks?: number;
  completedCount?: number;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  description: string;
  reminderPercentage?: number;
  taskProgress?: TaskProgress[];
  isRead: boolean;
  sentAt: string;
  type: string;
}

interface NotificationBellProps {
  pollInterval?: number;
}

export default function NotificationBell({ pollInterval = 30000 }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/projects-and-tasks/notifications/scheduled-reminders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch('/api/projects-and-tasks/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={24} className="text-gray-700" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-96 max-h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-linear-to-r from-brand-blue to-brand-blue/80 text-white">
                <h3 className="font-bold text-lg">Notifications</h3>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-blue-600 rounded transition-colors"
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <NotificationCard
                      key={notification._id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                    />
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-200 text-center">
                  <button
                    onClick={fetchNotifications}
                    className="text-sm text-brand-blue hover:text-brand-blue/80 font-semibold transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}