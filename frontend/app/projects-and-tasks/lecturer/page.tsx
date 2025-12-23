'use client';

import React from 'react';
import { BarChart3, Users, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function LecturerDashboard() {
  const stats = [
    {
      label: 'Active Projects',
      value: '12',
      icon: <Users className="text-blue-600" size={24} />,
      bg: 'bg-blue-50',
    },
    {
      label: 'At-Risk Teams',
      value: '2',
      icon: <AlertCircle className="text-red-600" size={24} />,
      bg: 'bg-red-50',
    },
    {
      label: 'Avg Completion',
      value: '78%',
      icon: <CheckCircle2 className="text-green-600" size={24} />,
      bg: 'bg-green-50',
    },
    {
      label: 'Due This Week',
      value: '5',
      icon: <Clock className="text-amber-600" size={24} />,
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Lecturer Dashboard
        </h1>
        <p className="text-gray-600">
          IT22001 • Software Engineering - Semester 1
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`${stat.bg} p-6 rounded-lg border border-gray-200`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">{stat.label}</h3>
              {stat.icon}
            </div>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recent Projects
            </h2>
            <div className="space-y-4">
              {[
                {
                  name: 'E-Commerce Platform',
                  teams: 3,
                  deadline: '2025-01-15',
                  status: 'On Track',
                  progress: 75,
                },
                {
                  name: 'Mobile App Development',
                  teams: 2,
                  deadline: '2025-01-20',
                  status: 'At Risk',
                  progress: 45,
                },
              ].map((project, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {project.teams} teams • {project.deadline}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        project.status === 'On Track'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors">
                Create Project
              </button>
              <button className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors">
                View Analytics
              </button>
              <button className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}