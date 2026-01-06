'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BookOpen,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Activity,
  ListTodo,
  Folder,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Course {
  _id: string;
  courseName: string;
  credits: number;
  year: number;
  semester: number;
  specializations: string[];
  isEligible: boolean;
}

interface Prediction {
  _id: string;
  prediction: {
    risk_level: string;
    risk_probability: number;
    confidence: number;
    at_risk: boolean;
  };
  inputData: {
    avg_score: number;
    completion_rate: number;
    total_clicks: number;
  };
  createdAt: string;
}

interface ProjectProgress {
  projectId: string;
  projectName: string;
  status: 'todo' | 'inprogress' | 'done';
  mainTasks: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  deadlineDate: string;
}

interface TaskProgress {
  taskId: string;
  taskName: string;
  status: 'todo' | 'inprogress' | 'done';
  subtasks: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  deadlineDate: string;
}

interface CourseProgress {
  course: Course;
  latestPrediction: Prediction | null;
  projects: ProjectProgress[];
  tasks: TaskProgress[];
  completionRate: number;
  projectsCompleted: number;
  tasksCompleted: number;
  totalProjects: number;
  totalTasks: number;
}

export default function LearningProgressPage() {
  const router = useRouter();
  const [coursesProgress, setCoursesProgress] = useState<CourseProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('risk');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      // Verify user
      const verifyResponse = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
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

      // Fetch all data in parallel
      const [coursesRes, predictionsRes, projectsRes, tasksRes] = await Promise.all([
        fetch('/api/student/get-courses', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/predictions?studentId=${userId}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/student/project-progress/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/student/task-progress/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!coursesRes.ok || !predictionsRes.ok) {
        setError('Failed to fetch data');
        setIsLoading(false);
        return;
      }

      const coursesData = await coursesRes.json();
      const predictionsData = await predictionsRes.json();
      const projectsData = projectsRes.ok ? await projectsRes.json() : { data: { projects: [] } };
      const tasksData = tasksRes.ok ? await tasksRes.json() : { data: { tasks: [] } };

      // Combine data per course
      const combinedData: CourseProgress[] = coursesData.data.courses.map((course: Course) => {
        // Get latest prediction (most recent)
        const latestPrediction = predictionsData.data.predictions[0] || null;

        // Get projects for this course
        const courseProjects = projectsData.data.projects.filter(
          (p: any) => p.courseId === course._id
        );

        // Get tasks for this course
        const courseTasks = tasksData.data.tasks.filter(
          (t: any) => t.courseId === course._id
        );

        // Calculate completion stats
        const projectsCompleted = courseProjects.filter((p: any) => p.status === 'done').length;
        const tasksCompleted = courseTasks.filter((t: any) => t.status === 'done').length;
        const totalProjects = courseProjects.length;
        const totalTasks = courseTasks.length;

        const completionRate =
          totalProjects + totalTasks > 0
            ? ((projectsCompleted + tasksCompleted) / (totalProjects + totalTasks)) * 100
            : 0;

        return {
          course,
          latestPrediction,
          projects: courseProjects,
          tasks: courseTasks,
          completionRate,
          projectsCompleted,
          tasksCompleted,
          totalProjects,
          totalTasks,
        };
      });

      setCoursesProgress(combinedData);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('An error occurred while fetching data');
      setIsLoading(false);
    }
  };

  // Calculate overall stats
  const overallStats = {
    totalCourses: coursesProgress.length,
    avgCompletion:
      coursesProgress.length > 0
        ? coursesProgress.reduce((sum, cp) => sum + cp.completionRate, 0) /
          coursesProgress.length
        : 0,
    atRiskCourses: coursesProgress.filter(
      (cp) =>
        cp.latestPrediction &&
        (cp.latestPrediction.prediction.risk_level === 'high' ||
          cp.latestPrediction.prediction.risk_level === 'medium')
    ).length,
    totalProjects: coursesProgress.reduce((sum, cp) => sum + cp.totalProjects, 0),
    totalTasks: coursesProgress.reduce((sum, cp) => sum + cp.totalTasks, 0),
  };

  // Filter and sort
  const filteredAndSortedCourses = coursesProgress
    .filter((cp) => {
      if (filterRisk === 'all') return true;
      if (!cp.latestPrediction) return filterRisk === 'unknown';
      return cp.latestPrediction.prediction.risk_level === filterRisk;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'risk':
          const riskOrder = { high: 3, medium: 2, low: 1, unknown: 0 };
          const aRisk = a.latestPrediction
            ? riskOrder[a.latestPrediction.prediction.risk_level as keyof typeof riskOrder]
            : 0;
          const bRisk = b.latestPrediction
            ? riskOrder[b.latestPrediction.prediction.risk_level as keyof typeof riskOrder]
            : 0;
          return bRisk - aRisk;
        case 'completion':
          return b.completionRate - a.completionRate;
        case 'name':
          return a.course.courseName.localeCompare(b.course.courseName);
        default:
          return 0;
      }
    });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <AlertTriangle className="text-red-600" size={20} />;
      case 'medium':
        return <Clock className="text-amber-600" size={20} />;
      case 'low':
        return <CheckCircle className="text-green-600" size={20} />;
      default:
        return <Activity className="text-gray-600" size={20} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading learning progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Learning Progress</h1>
        <p className="text-gray-600">Track your growth across all courses</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900">{overallStats.totalCourses}</p>
            </div>
            <BookOpen className="text-blue-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Completion</p>
              <p className="text-3xl font-bold text-gray-900">
                {overallStats.avgCompletion.toFixed(1)}%
              </p>
            </div>
            <Target className="text-green-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-amber-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Projects & Tasks</p>
              <p className="text-3xl font-bold text-gray-900">
                {overallStats.totalProjects + overallStats.totalTasks}
              </p>
            </div>
            <ListTodo className="text-amber-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">At-Risk Courses</p>
              <p className="text-3xl font-bold text-gray-900">{overallStats.atRiskCourses}</p>
            </div>
            <AlertTriangle className="text-red-600" size={40} />
          </div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Risk Level:</label>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Courses</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
            <option value="unknown">No Prediction</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Sort By:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="risk">Risk Level</option>
            <option value="completion">Completion Rate</option>
            <option value="name">Course Name</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-600">
          Showing {filteredAndSortedCourses.length} of {coursesProgress.length} courses
        </div>
      </div>

      {/* Course Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAndSortedCourses.map((courseProgress) => (
          <div
            key={courseProgress.course._id}
            className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          >
            {/* Course Header */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {courseProgress.course.courseName}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <BookOpen size={14} />
                      {courseProgress.course.credits} Credits
                    </span>
                    <span>•</span>
                    <span>
                      Year {courseProgress.course.year} | Sem {courseProgress.course.semester}
                    </span>
                  </div>
                </div>

                {/* Risk Badge */}
                {courseProgress.latestPrediction && (
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${getRiskColor(
                      courseProgress.latestPrediction.prediction.risk_level
                    )}`}
                  >
                    {getRiskIcon(courseProgress.latestPrediction.prediction.risk_level)}
                    <span className="text-sm font-semibold uppercase">
                      {courseProgress.latestPrediction.prediction.risk_level}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm font-bold text-gray-900">
                    {courseProgress.completionRate.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${courseProgress.completionRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Folder size={16} className="text-blue-600" />
                    <span className="text-xs text-gray-600">Projects</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {courseProgress.projectsCompleted}/{courseProgress.totalProjects}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ListTodo size={16} className="text-green-600" />
                    <span className="text-xs text-gray-600">Tasks</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {courseProgress.tasksCompleted}/{courseProgress.totalTasks}
                  </p>
                </div>
              </div>

              {/* Expandable Details Button */}
              <button
                onClick={() =>
                  setExpandedCourse(
                    expandedCourse === courseProgress.course._id
                      ? null
                      : courseProgress.course._id
                  )
                }
                className="w-full flex items-center justify-center gap-2 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {expandedCourse === courseProgress.course._id ? (
                  <>
                    <ChevronUp size={20} />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown size={20} />
                    View Details
                  </>
                )}
              </button>
            </div>

            {/* Expanded Details */}
            {expandedCourse === courseProgress.course._id && (
              <div className="border-t border-gray-200 bg-gray-50 p-6">
                {/* Projects List */}
                {courseProgress.projects.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Folder size={20} className="text-blue-600" />
                      Projects
                    </h4>
                    <div className="space-y-2">
                      {courseProgress.projects.map((project) => (
                        <div
                          key={project.projectId}
                          className="bg-white rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-900">{project.projectName}</p>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                project.status === 'done'
                                  ? 'bg-green-100 text-green-700'
                                  : project.status === 'inprogress'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {project.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>
                              {project.mainTasks.filter((t) => t.completed).length}/
                              {project.mainTasks.length} tasks
                            </span>
                            {project.deadlineDate && (
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                Due: {new Date(project.deadlineDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks List */}
                {courseProgress.tasks.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <ListTodo size={20} className="text-green-600" />
                      Tasks
                    </h4>
                    <div className="space-y-2">
                      {courseProgress.tasks.map((task) => (
                        <div
                          key={task.taskId}
                          className="bg-white rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-900">{task.taskName}</p>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                task.status === 'done'
                                  ? 'bg-green-100 text-green-700'
                                  : task.status === 'inprogress'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {task.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>
                              {task.subtasks.filter((st) => st.completed).length}/
                              {task.subtasks.length} subtasks
                            </span>
                            {task.deadlineDate && (
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                Due: {new Date(task.deadlineDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prediction Details */}
                {courseProgress.latestPrediction && (
                  <div className="mt-6 bg-white rounded-lg p-4 border-2 border-blue-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <BarChart3 size={20} className="text-blue-600" />
                      Latest Analytics
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Risk Probability</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {(courseProgress.latestPrediction.prediction.risk_probability * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Confidence</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {(courseProgress.latestPrediction.prediction.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Avg Score</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {courseProgress.latestPrediction.inputData.avg_score.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Engagement</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {(courseProgress.latestPrediction.inputData.total_clicks / 1000).toFixed(1)}K
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/learning-analytics/student/full-report')}
                      className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Full Report
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={64} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-600">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}