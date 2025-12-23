'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Users, BarChart3, Plus } from 'lucide-react';

export default function StudentDashboard() {
  const taskStats = [
    {
      label: 'Total Tasks',
      value: '12',
      icon: <CheckCircle2 size={24} />,
      color: 'blue',
    },
    {
      label: 'In Progress',
      value: '4',
      icon: <Clock size={24} />,
      color: 'amber',
    },
    {
      label: 'Pending',
      value: '5',
      icon: <AlertCircle size={24} />,
      color: 'red',
    },
    {
      label: 'Completed',
      value: '3',
      icon: <CheckCircle2 size={24} />,
      color: 'green',
    },
  ];

  const getStatColor = (color: string) => {
    const colors: { [key: string]: string } = {
      blue: 'bg-blue-50',
      amber: 'bg-amber-50',
      red: 'bg-red-50',
      green: 'bg-green-50',
    };
    return colors[color] || 'bg-gray-50';
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Student Dashboard
        </h1>
        <p className="text-gray-600">
          IT22001 • Software Engineering - Semester 1
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {taskStats.map((stat, index) => (
          <div
            key={index}
            className={`${getStatColor(stat.color)} p-6 rounded-lg border border-gray-200`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">{stat.label}</h3>
              <div className="text-gray-400">{stat.icon}</div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tasks Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Upcoming Deadlines
            </h2>
            <div className="space-y-4">
              {[
                {
                  task: 'Database Design',
                  project: 'Group Project A',
                  dueDate: 'Tomorrow',
                  priority: 'high',
                  progress: 85,
                },
                {
                  task: 'API Integration',
                  project: 'Group Project B',
                  dueDate: '2 days',
                  priority: 'high',
                  progress: 60,
                },
                {
                  task: 'Frontend Testing',
                  project: 'Individual Task',
                  dueDate: '4 days',
                  priority: 'medium',
                  progress: 40,
                },
              ].map((task, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    task.priority === 'high'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {task.task}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {task.project}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        task.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      Due {task.dueDate}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <Plus size={18} />
                Create Task
              </button>
              <button className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors">
                View Projects
              </button>
              <button className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors">
                Team Activity
              </button>
            </div>
          </div>

          {/* Daily Tip */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              💡 Daily Tip
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Break large tasks into smaller subtasks. This helps you stay
              organized and track progress more effectively.
            </p>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}