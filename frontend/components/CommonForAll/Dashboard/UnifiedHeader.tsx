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
  Clock,
  AlertCircle,
  Users,
  Activity,
  Database,
  BookOpen,
} from 'lucide-react';
import { useModuleConfig } from '@/hooks/useModuleConfig';

type UserRole = 'student' | 'lecture' | 'superadmin';

interface UserData {
  name: string;
  email: string;
  studentIdNumber?: string;
  position?: string;
  role?: string;
  _id?: string;
}

interface Course {
  _id: string;
  courseName: string;
  courseCode: string;
  credits: number;
  year: number;
  semester: number;
  lecturerInCharge: {
    _id: string;
    name: string;
  };
  lecturers: Array<{
    _id: string;
    name: string;
  }>;
}

interface Notification {
  id: number;
  message: string;
  time: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  icon: React.ElementType;
}

interface RoleConfig {
  courseCode: string;
  courseName: string;
  searchPlaceholder: string;
  avatarColor: string;
  primaryColor: string;
  notifications: Notification[];
  showPendingTasks?: boolean;
  pendingTasksCount?: number;
}

// Fallback config for superadmin
const superadminConfig: RoleConfig = {
  courseCode: 'ADMIN PANEL',
  courseName: 'System Administration',
  searchPlaceholder: 'Search users, courses, system logs...',
  avatarColor: 'from-purple-500 to-purple-600',
  primaryColor: 'purple',
  notifications: [
    {
      id: 1,
      message: 'New lecturer registration pending approval',
      time: '1 hour ago',
      type: 'info',
      icon: Users,
    },
    {
      id: 2,
      message: 'System backup completed successfully',
      time: '3 hours ago',
      type: 'success',
      icon: Database,
    },
    {
      id: 3,
      message: 'High server load detected - 85% CPU usage',
      time: '30 minutes ago',
      type: 'warning',
      icon: Activity,
    },
  ],
};

interface UnifiedHeaderProps {
  userRole: UserRole;
}

export default function UnifiedHeader({ userRole }: UnifiedHeaderProps) {
  const router = useRouter();
  const { headerConfig } = useModuleConfig(userRole);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Use module config if available, otherwise use superadmin config
  const config = headerConfig || superadminConfig;
  const unreadNotifications = config.notifications.length;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          router.push('/login');
          return;
        }

        const data = await response.json();
        setUserData(data.data.user);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Fetch courses for lecturer
  useEffect(() => {
    const fetchCoursesForLecturer = async () => {
      if (userRole !== 'lecture' || !userData?._id) return;

      setCoursesLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch('/api/lecturer/courses', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCourses(data.data.courses || []);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCoursesForLecturer();
  }, [userRole, userData?._id]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    router.push('/');
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setCourseDropdownOpen(false);
  };

  const displayName = userData?.name || (userRole === 'superadmin' ? 'Super Admin' : userRole === 'lecture' ? 'Lecturer' : 'Student');
  const displayId = userData?.studentIdNumber;
  const displayPosition = userData?.position;

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'alert':
        return 'bg-red-100 text-red-600';
      case 'warning':
        return 'bg-amber-100 text-amber-600';
      case 'success':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-blue-100 text-blue-600';
    }
  };

  // Separate courses into LIC and regular lecturer courses
  const licCourses = courses.filter(
    (course) => course.lecturerInCharge?._id === userData?._id
  );
  const regularCourses = courses.filter(
    (course) => course.lecturerInCharge?._id !== userData?._id
  );

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm" style={{ borderTop: '4px solid #efa300' }}>
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            {/* Course dropdown for lecturer */}
            {userRole === 'lecture' && courses.length > 0 ? (
              <div className="relative">
                <button
                  onClick={() => setCourseDropdownOpen(!courseDropdownOpen)}
                  className="hidden sm:flex items-center gap-2 bg-blue-100 rounded-md border border-blue-400 px-3 py-1.5 hover:bg-blue-150 hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <div className="flex flex-col text-left">
                    {selectedCourse ? (
                      <>
                        <h1 className="text-sm font-bold text-brand-blue truncate max-w-xs">{selectedCourse.courseName}</h1>
                        <p className="text-xs text-blue-500">Y{selectedCourse.year}S{selectedCourse.semester} • {selectedCourse.credits}cr</p>
                      </>
                    ) : (
                      <>
                        <h1 className="text-sm font-bold text-brand-blue">My Courses</h1>
                        <p className="text-xs text-blue-500">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
                      </>
                    )}
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-brand-blue transition-transform duration-200 flex-shrink-0 ${courseDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {courseDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen size={16} />
                        Assigned Courses
                      </h3>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {/* LIC Courses Section */}
                      {licCourses.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                            <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                              As Lecturer in Charge
                            </p>
                          </div>
                          {licCourses.map((course) => (
                            <div
                              key={course._id}
                              onClick={() => handleSelectCourse(course)}
                              className={`p-4 border-b border-gray-100 hover:bg-amber-100 cursor-pointer transition-all duration-150 ${
                                selectedCourse?._id === course._id ? 'bg-amber-100 border-l-4 border-l-amber-500' : 'bg-amber-50/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {course.courseName}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Year {course.year}, Semester {course.semester} • {course.credits} Credits
                                  </p>
                                </div>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-200 text-amber-800 whitespace-nowrap ml-2">
                                  LIC
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Regular Courses Section */}
                      {regularCourses.length > 0 && (
                        <div>
                          {licCourses.length > 0 && (
                            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                                As Lecturer
                              </p>
                            </div>
                          )}
                          {regularCourses.map((course) => (
                            <div
                              key={course._id}
                              onClick={() => handleSelectCourse(course)}
                              className={`p-4 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-all duration-150 ${
                                selectedCourse?._id === course._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                              }`}
                            >
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                  {course.courseName}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Year {course.year}, Semester {course.semester} • {course.credits} Credits
                                </p>
                                {course.lecturerInCharge && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    LIC: {course.lecturerInCharge.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {coursesLoading && (
                      <div className="p-4 text-center">
                        <p className="text-sm text-gray-500">Loading courses...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Default dropdown for non-lecturer roles - Hidden for students/superadmin */
              userRole !== 'lecture' && (
                <button className="hidden sm:flex items-center gap-2 bg-blue-100 rounded-md border border-blue-400 px-3 py-1.5 hover:bg-blue-150 hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md">
                  <div className="flex flex-col text-left">
                    <h1 className="text-sm font-bold text-brand-blue">{config.courseCode}</h1>
                    <p className="text-xs text-blue-500">{config.courseName}</p>
                  </div>
                </button>
              )
            )}
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={config.searchPlaceholder}
                className={`w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${config.primaryColor}-500`}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            {config.showPendingTasks && config.pendingTasksCount && config.pendingTasksCount > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                <span className="text-xs font-semibold text-amber-900">{config.pendingTasksCount} pending</span>
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-brand-blue hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      {unreadNotifications > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                          {unreadNotifications} new
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {config.notifications.map((notif) => {
                      const IconComponent = notif.icon;
                      return (
                        <div
                          key={notif.id}
                          className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex gap-3">
                            <div className={`mt-1 flex-shrink-0 p-2 rounded ${getNotificationColor(notif.type)}`}>
                              <IconComponent size={16} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 font-medium">{notif.message}</p>
                              <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 border-t border-gray-100 text-center">
                    <button className={`text-sm text-${config.primaryColor}-600 hover:text-${config.primaryColor}-700 font-medium`}>
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="w-0.5 h-8 bg-brand-blue"></div>

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className={`w-8 h-8 bg-gradient-to-br ${config.avatarColor} rounded-full flex items-center justify-center text-white text-sm font-semibold`}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                {userRole === 'student' ? (
                  <div className="hidden sm:flex flex-col items-start text-left">
                    <span className="text-sm font-medium text-gray-900">
                      {!isLoading ? displayName : 'Loading...'}
                    </span>
                    {displayId && <span className="text-xs text-gray-500">{displayId}</span>}
                  </div>
                ) : (
                  <span className="hidden sm:inline text-sm font-medium text-gray-900">
                    {!isLoading ? displayName : 'Loading...'}
                  </span>
                )}
                <ChevronDown
                  size={16}
                  className={`text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                    {displayId && <p className="text-xs text-gray-500">ID: {displayId}</p>}
                    {displayPosition && <p className="text-xs text-gray-500 capitalize">{displayPosition}</p>}
                    {userData?.email && <p className="text-xs text-gray-500">{userData.email}</p>}
                  </div>
                  <div className="py-2">
                    {userRole === 'superadmin' ? (
                      <>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Settings size={16} />
                          System Settings
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Users size={16} />
                          User Management
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Database size={16} />
                          Database Settings
                        </button>
                      </>
                    ) : userRole === 'lecture' ? (
                      <>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Settings size={16} />
                          Course Settings
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Settings size={16} />
                          Profile Settings
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Settings size={16} />
                          My Profile
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Settings size={16} />
                          Preferences
                        </button>
                      </>
                    )}
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