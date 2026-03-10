'use client';

import React, { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Server,
  Shield,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  userType: 'student' | 'lecturer';
  studentIdNumber?: string;
  position?: string;
  department?: string;
  createdAt: string;
  isVerified?: boolean;
}

interface Course {
  _id: string;
  courseName: string;
  credits: number;
  year: number;
  semester: number;
  isArchived: boolean;
  createdAt: string;
}

interface PendingUser extends AdminUser {
  userType: 'student' | 'lecturer';
}

type AlertItem = {
  message: string;
  severity: 'warning' | 'info' | 'error';
  time: string;
};

type ActivityItem = {
  action: string;
  user: string;
  time: string;
  color: 'blue' | 'green' | 'amber' | 'red';
  icon: React.ReactNode;
};

const getRelativeTime = (dateString?: string) => {
  if (!dateString) return 'Unknown time';
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) return 'Unknown time';

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const getStatColor = (color: string) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
    purple: 'bg-purple-50 border-purple-200',
  };
  return colors[color] || 'bg-gray-50 border-gray-200';
};

const getAlertColor = (severity: AlertItem['severity']) => {
  const colors: Record<AlertItem['severity'], string> = {
    warning: 'bg-amber-50 border-amber-300 text-amber-800',
    info: 'bg-blue-50 border-blue-300 text-blue-800',
    error: 'bg-red-50 border-red-300 text-red-800',
  };
  return colors[severity];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseStats, setCourseStats] = useState({ total: 0, active: 0, archived: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);

  const fetchDashboardData = useEffectEvent(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [usersResponse, pendingResponse, coursesResponse] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/users/pending', { headers }),
        fetch('/api/admin/courses', { headers }),
      ]);

      if ([usersResponse, pendingResponse, coursesResponse].some((response) => response.status === 401)) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        router.push('/login');
        return;
      }

      if (!usersResponse.ok || !pendingResponse.ok || !coursesResponse.ok) {
        throw new Error('Failed to fetch admin dashboard data');
      }

      const [usersPayload, pendingPayload, coursesPayload] = await Promise.all([
        usersResponse.json(),
        pendingResponse.json(),
        coursesResponse.json(),
      ]);

      setUsers(usersPayload.data?.users || []);
      setPendingUsers(pendingPayload.data?.pendingUsers || []);
      setCourses(coursesPayload.data?.courses || []);
      setCourseStats(coursesPayload.data?.stats || { total: 0, active: 0, archived: 0 });
      setError(null);
    } catch (fetchError) {
      console.error('Admin dashboard fetch error:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    void fetchDashboardData();
  }, [router]);

  const handleApproveReject = async (
    userId: string,
    userType: 'student' | 'lecturer',
    action: 'approve' | 'reject'
  ) => {
    setApproveLoading(userId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/users/approve', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userType,
          action,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Failed to update approval status');
      }

      if (action === 'approve') {
        setUsers((prev) => prev.map((user) => (user._id === userId ? { ...user, isVerified: true } : user)));
      } else {
        setUsers((prev) => prev.filter((user) => user._id !== userId));
      }
      setPendingUsers((prev) => prev.filter((user) => user._id !== userId));
    } catch (approvalError) {
      console.error('Admin approval action error:', approvalError);
      setError(approvalError instanceof Error ? approvalError.message : 'Failed to process request');
    } finally {
      setApproveLoading(null);
    }
  };

  const stats = useMemo(() => {
    const verifiedLecturers = users.filter((user) => user.userType === 'lecturer' && user.isVerified !== false).length;
    return [
      {
        label: 'Total Users',
        value: users.length.toLocaleString(),
        icon: <Users size={24} />,
        color: 'blue',
      },
      {
        label: 'Active Courses',
        value: String(courseStats.active),
        icon: <FileText size={24} />,
        color: 'green',
      },
      {
        label: 'Verified Lecturers',
        value: String(verifiedLecturers),
        icon: <UserCog size={24} />,
        color: 'amber',
      },
      {
        label: 'Pending Approvals',
        value: String(pendingUsers.length),
        icon: <Clock size={24} />,
        color: 'red',
      },
    ];
  }, [courseStats.active, pendingUsers.length, users]);

  const recentActivities = useMemo<ActivityItem[]>(() => {
    const latestUsers = users
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2)
      .map((user) => ({
        action: `${user.userType === 'student' ? 'Student' : 'Lecturer'} account ${user.isVerified === false ? 'awaiting approval' : 'registered'}`,
        user: user.name,
        time: getRelativeTime(user.createdAt),
        icon: <UserCog size={18} />,
        color: user.isVerified === false ? 'amber' : 'blue',
      }));

    const latestCourses = courses
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2)
      .map((course) => ({
        action: course.isArchived ? 'Course archived' : 'Course created',
        user: course.courseName,
        time: getRelativeTime(course.createdAt),
        icon: <FileText size={18} />,
        color: course.isArchived ? 'red' : 'green',
      }));

    return [...latestUsers, ...latestCourses]
      .sort((a, b) => {
        const order = ['Just now'];
        if (order.includes(a.time) && !order.includes(b.time)) return -1;
        if (!order.includes(a.time) && order.includes(b.time)) return 1;
        return 0;
      })
      .slice(0, 4);
  }, [courses, users]);

  const systemAlerts = useMemo<AlertItem[]>(() => {
    const alerts: AlertItem[] = [];

    if (pendingUsers.length > 0) {
      alerts.push({
        message: `${pendingUsers.length} account${pendingUsers.length === 1 ? '' : 's'} pending approval`,
        severity: 'warning',
        time: 'Updated just now',
      });
    }

    if (courseStats.archived > 0) {
      alerts.push({
        message: `${courseStats.archived} archived course${courseStats.archived === 1 ? '' : 's'} in the catalog`,
        severity: 'info',
        time: 'Based on current course data',
      });
    }

    const unverifiedUsers = users.filter((user) => user.isVerified === false).length;
    if (unverifiedUsers > 0) {
      alerts.push({
        message: `${unverifiedUsers} user account${unverifiedUsers === 1 ? '' : 's'} still unverified`,
        severity: 'error',
        time: 'Based on current user data',
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        message: 'No outstanding admin alerts right now',
        severity: 'info',
        time: 'Live status',
      });
    }

    return alerts.slice(0, 3);
  }, [courseStats.archived, pendingUsers.length, users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          System Administration
        </h1>
        <p className="text-gray-600">
          Smart LMS • Platform Overview & Management
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${getStatColor(stat.color)} p-6 rounded-lg border`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">{stat.label}</h3>
              <div className="text-gray-400">{stat.icon}</div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Pending Approvals
              </h2>
              <span className="bg-red-100 text-red-700 text-sm font-semibold px-3 py-1 rounded-full">
                {pendingUsers.length} pending
              </span>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                No pending approvals.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.slice(0, 5).map((approval) => (
                  <div
                    key={approval._id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {approval.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {approval.userType === 'student' ? 'Student' : 'Lecturer'} • {approval.department || approval.position || approval.email}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Submitted {getRelativeTime(approval.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApproveReject(approval._id, approval.userType, 'approve')}
                          disabled={approveLoading === approval._id}
                          className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button
                          onClick={() => handleApproveReject(approval._id, approval.userType, 'reject')}
                          disabled={approveLoading === approval._id}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => router.push('/admin/users?filter=pending')}
              className="w-full mt-4 py-2 border border-purple-300 hover:border-purple-400 text-purple-700 rounded-lg font-medium transition-colors"
            >
              View All Approvals
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              System Alerts
            </h2>
            <div className="space-y-3">
              {systemAlerts.map((alert, index) => (
                <div
                  key={`${alert.message}-${index}`}
                  className={`p-4 border rounded-lg ${getAlertColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs mt-1 opacity-75">{alert.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/users')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <UserCog size={18} />
                Manage Users
              </button>
              <button
                onClick={() => router.push('/admin/courses')}
                className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={18} />
                Manage Courses
              </button>
              <button
                onClick={() => router.push('/admin/users?filter=pending')}
                className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Shield size={18} />
                Review Approvals
              </button>
              <button
                onClick={() => router.push('/admin/courses?filter=archived')}
                className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Activity size={18} />
                Archived Courses
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-gray-500">No recent admin activity available.</p>
              ) : (
                recentActivities.map((activity, index) => (
                  <div
                    key={`${activity.action}-${activity.user}-${index}`}
                    className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0"
                  >
                    <div
                      className={`p-2 rounded-lg ${getStatColor(activity.color)}`}
                    >
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {activity.user}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border border-purple-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Server size={20} />
              Admin Snapshot
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Verified Users</span>
                <span className="font-semibold text-green-700">
                  {users.filter((user) => user.isVerified !== false).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Archived Courses</span>
                <span className="font-semibold text-gray-700">{courseStats.archived}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Latest Approval</span>
                <span className="font-semibold text-gray-700">
                  {pendingUsers[0]?.createdAt ? getRelativeTime(pendingUsers[0].createdAt) : 'None'}
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin/users')}
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
