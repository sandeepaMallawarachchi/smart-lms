'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Search,
  Menu,
} from 'lucide-react';

interface LecturerData {
  name: string;
  email: string;
  position?: string;
}

export default function LecturerHeader() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lecturerData, setLecturerData] = useState<LecturerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Static course info (can be fetched separately if needed)
  const courseCode = 'IT22001';
  const courseName = 'Software Engineering - Semester 1';
  const unreadNotifications = 3;

  const notifications = [
    { id: 1, message: 'Team "Group A" has completed milestone 1', time: '2 hours ago', type: 'success' },
    { id: 2, message: 'Workload imbalance detected in "Group B"', time: '1 hour ago', type: 'warning' },
    { id: 3, message: 'Task bottleneck in "Project X"', time: '30 minutes ago', type: 'alert' },
  ];

  useEffect(() => {
    const fetchLecturerData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          router.push('/projects-and-tasks/login');
          return;
        }

        const response = await fetch('/api/projects-and-tasks/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          router.push('/projects-and-tasks/login');
          return;
        }

        const data = await response.json();
        setLecturerData(data.data.user);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching lecturer data:', error);
        setIsLoading(false);
      }
    };

    fetchLecturerData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    router.push('/projects-and-tasks/login');
  };

  // Use real data or fallback
  const displayName = lecturerData?.name || 'Lecturer';

  return (
    <header className="sticky top-0 z-40 bg-yellow-50 border-b border-gray-200 shadow-sm">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Menu Toggle & Branding */}
          <div className="flex items-center gap-4">
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex flex-col">
              <h1 className="text-sm font-bold text-gray-900">{courseCode}</h1>
              <p className="text-xs text-gray-500">{courseName}</p>
            </div>
          </div>

          {/* Center: Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search tasks, students, projects..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-6">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <p className="text-sm text-gray-900">{notif.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-100 text-center">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-900">
                  {!isLoading ? displayName : 'Loading...'}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                    {lecturerData?.email && (
                      <p className="text-xs text-gray-500">{lecturerData.email}</p>
                    )}
                    {lecturerData?.position && (
                      <p className="text-xs text-gray-500 capitalize">{lecturerData.position}</p>
                    )}
                  </div>
                  <div className="py-2">
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Settings size={16} />
                      Course Settings
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Settings size={16} />
                      Profile Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-100 p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}