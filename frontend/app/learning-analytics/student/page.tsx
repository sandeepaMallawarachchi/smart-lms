'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Award,
  Target,
  BookOpen,
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

interface StudentData {
  studentIdNumber: string;
  name: string;
  email: string;
  specialization: string;
  semester: string;
  academicYear: string;
}

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const token = localStorage.getItem('authToken');

        if (!token) {
          setError('Not authenticated');
          setIsLoading(false);
          return;
        }

        // First, verify user to get student ID
        const verifyResponse = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!verifyResponse.ok) {
          setError('Failed to verify user');
          setIsLoading(false);
          return;
        }

        const verifyData = await verifyResponse.json();
        const userId = verifyData.data?.user?._id;

        if (!userId) {
          setError('User ID not found');
          setIsLoading(false);
          return;
        }

        // Fetch student details using MongoDB ID
        const studentResponse = await fetch(`/api/student/${userId}`);

        if (!studentResponse.ok) {
          setError('Failed to fetch student data');
          setIsLoading(false);
          return;
        }

        const studentResult = await studentResponse.json();
        setStudentData(studentResult.data.student);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('An error occurred');
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  const analyticsStats = [
    {
      label: 'Overall Progress',
      value: '85%',
      icon: <TrendingUp size={24} />,
      color: 'blue',
      change: '+12%',
    },
    {
      label: 'Completion Rate',
      value: '92%',
      icon: <CheckCircle2 size={24} />,
      color: 'green',
      change: '+8%',
    },
    {
      label: 'At Risk',
      value: '2',
      icon: <AlertCircle size={24} />,
      color: 'red',
      change: '-1',
    },
    {
      label: 'Achievements',
      value: '15',
      icon: <Award size={24} />,
      color: 'amber',
      change: '+3',
    },
  ];

  const performanceMetrics = [
    {
      subject: 'Software Engineering Fundamentals',
      progress: 88,
      grade: 'A',
      status: 'excellent',
    },
    {
      subject: 'Data Structures & Algorithms',
      progress: 75,
      grade: 'B+',
      status: 'good',
    },
    {
      subject: 'Database Management Systems',
      progress: 65,
      grade: 'B',
      status: 'needs-improvement',
    },
  ];

  const learningGoals = [
    {
      goal: 'Complete ML module',
      deadline: '2 weeks',
      progress: 60,
    },
    {
      goal: 'Improve coding speed',
      deadline: '1 month',
      progress: 40,
    },
    {
      goal: 'Master React Hooks',
      deadline: '3 weeks',
      progress: 75,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-50 border-green-200';
      case 'good':
        return 'bg-blue-50 border-blue-200';
      case 'needs-improvement':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getSpecializationName = (code: string) => {
    const specializations: { [key: string]: string } = {
      'IT': 'Information Technology',
      'SE': 'Software Engineering',
      'DS': 'Data Science',
      'CSNE': 'Computer Systems & Networking',
      'CS': 'Cyber Security',
      'IM': 'Interactive Media',
    };
    return specializations[code] || code;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Learning Analytics & Insights
        </h1>
        <div className="flex items-center gap-4 text-gray-600">
          <p>{studentData?.studentIdNumber}</p>
          <span>•</span>
          <p>{getSpecializationName(studentData?.specialization || '')}</p>
          <span>•</span>
          <p>Year {studentData?.academicYear}</p>
          <span>•</span>
          <p>Semester {studentData?.semester}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {analyticsStats.map((stat, index) => (
          <div
            key={index}
            className={`${getStatColor(stat.color)} p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">{stat.label}</h3>
              <div className="text-gray-400">{stat.icon}</div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Metrics Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Course Performance
              </h2>
              <BarChart3 className="text-gray-400" size={20} />
            </div>
            <div className="space-y-4">
              {performanceMetrics.map((metric, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${getStatusColor(metric.status)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {metric.subject}
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-600">
                          Grade: <span className="font-semibold">{metric.grade}</span>
                        </span>
                        <span className="text-sm text-gray-600">
                          Progress: <span className="font-semibold">{metric.progress}%</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${metric.status === 'excellent'
                          ? 'bg-green-500'
                          : metric.status === 'good'
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                      style={{ width: `${metric.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Goals */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Learning Goals
              </h2>
              <Target className="text-gray-400" size={20} />
            </div>
            <div className="space-y-4">
              {learningGoals.map((goal, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{goal.goal}</h3>
                    <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                      {goal.deadline}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{goal.progress}% complete</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Insights & Recommendations */}
        <div>
          {/* AI Insights */}
          <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 mb-6 border border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="text-blue-600" size={20} />
              AI Insights
            </h2>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  📈 Strong Performance
                </p>
                <p className="text-xs text-gray-600">
                  Your completion rate is 12% higher than class average. Keep up the excellent work!
                </p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  ⚠️ Needs Attention
                </p>
                <p className="text-xs text-gray-600">
                  Database Management needs more focus. Consider reviewing past modules.
                </p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  💡 Recommendation
                </p>
                <p className="text-xs text-gray-600">
                  You excel at morning study sessions. Schedule complex topics for 9-11 AM.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="flex flex-col space-y-3 text-center">
              <Link href={"/learning-analytics/student/full-report"} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <BookOpen size={18} />
                View Full Report
              </Link>
              <Link href={'#'} className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors">
                Set New Goal
              </Link>
              <Link href={'#'} className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors">
                Compare with Peers
              </Link>
            </div>
          </div>

          {/* Study Tip */}
          <div className="bg-linear-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              💡 Study Tip
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              The Pomodoro Technique: Study for 25 minutes, then take a 5-minute break. This improves focus and retention.
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