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

interface PredictionData {
  prediction?: {
    risk_level?: 'low' | 'medium' | 'high';
  };
}

interface LearningGoal {
  _id: string;
  title: string;
  targetDate: string;
  status: 'todo' | 'inprogress' | 'done' | 'active' | 'completed';
}

interface Course {
  _id: string;
  courseName: string;
  credits: number;
  year: number;
  semester: number;
  specializations: string[];
}

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learningGoals, setLearningGoals] = useState<LearningGoal[]>([]);
  const [coursePerformance, setCoursePerformance] = useState<Array<{
    subject: string;
    progress: number;
    grade: string;
    status: 'excellent' | 'good' | 'needs-improvement';
  }>>([]);
  const [insights, setInsights] = useState<Array<{ title: string; message: string }>>([]);
  const [overviewStats, setOverviewStats] = useState({
    overallProgress: 0,
    completionRate: 0,
    riskLevel: 'unknown',
    achievements: 0,
  });

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

        const headers = { Authorization: `Bearer ${token}` };

        const [featuresRes, predictionRes, goalsRes, projectsRes, tasksRes, coursesRes] = await Promise.all([
          fetch('/api/learning-analytics/features', { headers }),
          fetch('/api/predictions/latest', { headers }),
          fetch('/api/student/learning-goals?status=all', { headers }),
          fetch('/api/student/project-progress/projects', { headers }),
          fetch('/api/student/task-progress/tasks', { headers }),
          fetch('/api/student/get-courses', { headers }),
        ]);

        const featuresData = featuresRes.ok ? await featuresRes.json() : null;
        const predictionData = predictionRes.ok ? await predictionRes.json() : null;
        const goalsData = goalsRes.ok ? await goalsRes.json() : null;
        const projectsData = projectsRes.ok ? await projectsRes.json() : null;
        const tasksData = tasksRes.ok ? await tasksRes.json() : null;
        const coursesData = coursesRes.ok ? await coursesRes.json() : null;

        const payload = featuresData?.data?.payload;
        const completionRate = payload?.completion_rate ? payload.completion_rate * 100 : 0;
        const overallProgress = Math.round(completionRate);

        const riskLevel = (predictionData?.data?.prediction as PredictionData | undefined)?.prediction?.risk_level || 'unknown';

        const projects = projectsData?.data?.projects || [];
        const tasks = tasksData?.data?.tasks || [];
        const completedProjects = projects.filter((p: any) => p.status === 'done').length;
        const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
        const achievements = completedProjects + completedTasks;

        const courses: Course[] = coursesData?.data?.courses || [];
        const performance = courses.map((course) => {
          const courseProjects = projects.filter((p: any) => p.courseId === course._id);
          const courseTasks = tasks.filter((t: any) => t.courseId === course._id);
          const totalItems = courseProjects.length + courseTasks.length;
          const completedItems =
            courseProjects.filter((p: any) => p.status === 'done').length +
            courseTasks.filter((t: any) => t.status === 'done').length;
          const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
          const status = progress >= 80 ? 'excellent' : progress >= 60 ? 'good' : 'needs-improvement';
          const grade = progress >= 80 ? 'A' : progress >= 70 ? 'B+' : progress >= 60 ? 'B' : 'C';
          return {
            subject: course.courseName,
            progress,
            grade,
            status,
          };
        });
        setCoursePerformance(performance.slice(0, 3));

        setOverviewStats({
          overallProgress,
          completionRate,
          riskLevel,
          achievements,
        });

        setLearningGoals(goalsData?.data?.goals || []);
        if (payload) {
          const engagement = payload.total_clicks || 0;
          const engagementText =
            engagement > 0
              ? `You’ve logged ${engagement.toLocaleString()} interactions so far. Keep the momentum going.`
              : 'We don’t have enough activity data yet. Start engaging with tasks to build insights.';
          const completionText =
            completionRate >= 70
              ? 'Strong completion rate. You’re keeping up with your coursework.'
              : completionRate > 0
              ? 'Your completion rate is below target. Focus on finishing pending tasks.'
              : 'No completion data yet. Complete a task to begin tracking progress.';
          const riskText =
            riskLevel === 'high'
              ? `Your risk is high because the model includes engagement, late work, and score trends in addition to completion (${completionRate.toFixed(1)}%).`
              : riskLevel === 'medium'
              ? 'You are at medium risk. Small improvements can lift your standing.'
              : riskLevel === 'low'
              ? 'Low risk detected. Keep your current pace steady.'
              : 'Risk level is not available yet.';
          setInsights([
            { title: 'Engagement Snapshot', message: engagementText },
            { title: 'Completion Status', message: completionText },
            { title: 'Risk Guidance', message: riskText },
          ]);
        } else {
          setInsights([
            { title: 'Engagement Snapshot', message: 'Engagement data is not available yet.' },
            { title: 'Completion Status', message: 'Completion data is not available yet.' },
            { title: 'Risk Guidance', message: 'Risk data is not available yet.' },
          ]);
        }
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
      value: `${overviewStats.overallProgress}%`,
      icon: <TrendingUp size={24} />,
      color: 'blue',
    },
    {
      label: 'Completion Rate',
      value: `${overviewStats.completionRate.toFixed(1)}%`,
      icon: <CheckCircle2 size={24} />,
      color: 'green',
    },
    {
      label: 'Risk Level',
      value: overviewStats.riskLevel.toUpperCase(),
      icon: <AlertCircle size={24} />,
      color: overviewStats.riskLevel === 'high' ? 'red' : overviewStats.riskLevel === 'medium' ? 'amber' : 'green',
    },
    {
      label: 'Achievements',
      value: `${overviewStats.achievements}`,
      icon: <Award size={24} />,
      color: 'amber',
    },
  ];

  const performanceMetrics = coursePerformance;

  const formatTargetDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
              {performanceMetrics.length === 0 && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
                  No course performance data yet.
                </div>
              )}
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
              {learningGoals.length === 0 && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
                  No goals yet.
                </div>
              )}
              {learningGoals.map((goal) => (
                <div key={goal._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                    <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                      {formatTargetDate(goal.targetDate)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Status: {goal.status === 'inprogress' ? 'In Progress' : goal.status === 'todo' || goal.status === 'active' ? 'To Do' : 'Done'}
                  </p>
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
              {insights.map((insight, index) => (
                <div key={index} className="bg-white rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    {insight.title}
                  </p>
                  <p className="text-xs text-gray-600">
                    {insight.message}
                  </p>
                </div>
              ))}
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
              <Link href={'/learning-analytics/student/learning-goals'} className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors">
                Set New Goal
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
