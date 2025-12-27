'use client';

import React from 'react';
import {
  Users,
  UserCog,
  Database,
  Activity,
  AlertTriangle,
  TrendingUp,
  Server,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';

export default function AdminDashboard() {
  const systemStats = [
    {
      label: 'Total Users',
      value: '1,234',
      change: '+12%',
      icon: <Users size={24} />,
      color: 'blue',
      trend: 'up',
    },
    {
      label: 'Active Courses',
      value: '45',
      change: '+3',
      icon: <FileText size={24} />,
      color: 'green',
      trend: 'up',
    },
    {
      label: 'System Load',
      value: '67%',
      change: '+5%',
      icon: <Activity size={24} />,
      color: 'amber',
      trend: 'up',
    },
    {
      label: 'Pending Approvals',
      value: '8',
      change: '-2',
      icon: <Clock size={24} />,
      color: 'red',
      trend: 'down',
    },
  ];

  const pendingApprovals = [
    {
      name: 'Dr. Samantha Fernando',
      type: 'Lecturer',
      department: 'Computer Science',
      date: '2 hours ago',
      status: 'pending',
    },
    {
      name: 'Mr. Ashan Perera',
      type: 'Lecturer',
      department: 'Software Engineering',
      date: '5 hours ago',
      status: 'pending',
    },
    {
      name: 'Ms. Nimesha Silva',
      type: 'Lecturer',
      department: 'Information Systems',
      date: '1 day ago',
      status: 'pending',
    },
  ];

  const recentActivities = [
    {
      action: 'New lecturer registered',
      user: 'Dr. Kamal Wijesinghe',
      time: '10 minutes ago',
      icon: <UserCog size={18} />,
      color: 'blue',
    },
    {
      action: 'System backup completed',
      user: 'System',
      time: '1 hour ago',
      icon: <Database size={18} />,
      color: 'green',
    },
    {
      action: 'Security alert detected',
      user: 'Security Monitor',
      time: '2 hours ago',
      icon: <Shield size={18} />,
      color: 'red',
    },
    {
      action: 'New course created',
      user: 'Prof. Kumara',
      time: '3 hours ago',
      icon: <FileText size={18} />,
      color: 'purple',
    },
  ];

  const systemAlerts = [
    {
      message: 'High server CPU usage detected - 85%',
      severity: 'warning',
      time: '30 minutes ago',
    },
    {
      message: '5 lecturer accounts pending approval',
      severity: 'info',
      time: '1 hour ago',
    },
    {
      message: 'Scheduled maintenance in 2 days',
      severity: 'info',
      time: '2 hours ago',
    },
  ];

  const getStatColor = (color: string) => {
    const colors: { [key: string]: string } = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      amber: 'bg-amber-50 border-amber-200',
      red: 'bg-red-50 border-red-200',
      purple: 'bg-purple-50 border-purple-200',
    };
    return colors[color] || 'bg-gray-50 border-gray-200';
  };

  const getAlertColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      warning: 'bg-amber-50 border-amber-300 text-amber-800',
      info: 'bg-blue-50 border-blue-300 text-blue-800',
      error: 'bg-red-50 border-red-300 text-red-800',
    };
    return colors[severity] || 'bg-gray-50 border-gray-300 text-gray-800';
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {systemStats.map((stat, index) => (
          <div
            key={index}
            className={`${getStatColor(stat.color)} p-6 rounded-lg border`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">{stat.label}</h3>
              <div className="text-gray-400">{stat.icon}</div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <span
                className={`text-sm font-medium ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change}
              </span>
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
                {pendingApprovals.length} pending
              </span>
            </div>
            <div className="space-y-4">
              {pendingApprovals.map((approval, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {approval.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {approval.type} • {approval.department}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Submitted {approval.date}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors">
                        <CheckCircle2 size={18} />
                      </button>
                      <button className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors">
                        <XCircle size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 border border-purple-300 hover:border-purple-400 text-purple-700 rounded-lg font-medium transition-colors">
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
                  key={index}
                  className={`p-4 border rounded-lg ${getAlertColor(
                    alert.severity
                  )}`}
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
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <UserCog size={18} />
                Manage Users
              </button>
              <button className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <Database size={18} />
                Database Backup
              </button>
              <button className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <Shield size={18} />
                Security Logs
              </button>
              <button className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <Activity size={18} />
                System Analytics
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div
                  key={index}
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
              ))}
            </div>
          </div>

          <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border border-purple-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Server size={20} />
              System Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Server Uptime</span>
                <span className="font-semibold text-green-700">99.8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Database Health</span>
                <span className="font-semibold text-green-700">Good</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Last Backup</span>
                <span className="font-semibold text-gray-700">3h ago</span>
              </div>
            </div>
            <button className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded transition-colors">
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}