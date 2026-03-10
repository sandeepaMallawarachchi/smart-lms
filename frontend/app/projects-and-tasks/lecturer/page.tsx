'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader,
  Plus,
  Users,
} from 'lucide-react';

interface SelectedCourse {
  _id: string;
  courseName: string;
  courseCode?: string;
  year: number;
  semester: number;
}

interface LecturerData {
  _id: string;
  name: string;
  email: string;
  position?: string;
}

interface AssignedGroup {
  _id: string;
  groupName: string;
}

interface Project {
  _id: string;
  projectName: string;
  assignedGroups?: AssignedGroup[];
  assignedGroupIds?: string[];
  deadlineDate?: string;
  deadlineTime?: string;
  isPublished?: boolean;
  createdAt?: string;
}

interface Task {
  _id: string;
  taskName: string;
  deadlineDate?: string;
  deadlineTime?: string;
  isPublished?: boolean;
  createdAt?: string;
}

interface StudentRow {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  assigned: number;
  done: number;
  inProgress: number;
  todo: number;
  overdue: number;
  completionRate: number;
  lastActivity: string | null;
}

interface ReportData {
  courseId: string;
  courseName: string;
  generatedAt: string;
  itemType: 'all' | 'project' | 'task';
  kpis: {
    totalStudents: number;
    totalAssigned: number;
    totalDone: number;
    totalInProgress: number;
    totalTodo: number;
    totalOverdue: number;
    completionRate: number;
  };
  students: StudentRow[];
}

type LecturerItem =
  | {
      _id: string;
      name: string;
      type: 'Project';
      deadlineDate?: string;
      deadlineTime?: string;
      createdAt?: string;
      published: boolean;
      meta: string;
    }
  | {
      _id: string;
      name: string;
      type: 'Task';
      deadlineDate?: string;
      deadlineTime?: string;
      createdAt?: string;
      published: boolean;
      meta: string;
    };

const getDeadlineDate = (deadlineDate?: string, deadlineTime?: string) => {
  if (!deadlineDate) return null;
  const parsed = new Date(`${deadlineDate}T${deadlineTime || '23:59'}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDeadlineText = (deadlineDate?: string, deadlineTime?: string) => {
  const deadline = getDeadlineDate(deadlineDate, deadlineTime);
  if (!deadline) return 'No deadline';

  const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'}`;
  if (daysUntil === 0) return 'Due today';
  if (daysUntil === 1) return 'Due tomorrow';
  return `Due in ${daysUntil} days`;
};

const getPriority = (deadlineDate?: string, deadlineTime?: string) => {
  const deadline = getDeadlineDate(deadlineDate, deadlineTime);
  if (!deadline) return 'low' as const;
  const hoursUntil = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil <= 24) return 'high' as const;
  if (hoursUntil <= 72) return 'medium' as const;
  return 'low' as const;
};

export default function LecturerDashboard() {
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [lecturer, setLecturer] = useState<LecturerData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCourseSelection = (event: CustomEvent<SelectedCourse>) => {
      setSelectedCourse(event.detail);
      localStorage.setItem('selectedCourse', JSON.stringify(event.detail));
    };

    const savedCourse = localStorage.getItem('selectedCourse');
    if (savedCourse) {
      try {
        setSelectedCourse(JSON.parse(savedCourse));
      } catch (parseError) {
        console.error('Error parsing saved course:', parseError);
      }
    }

    window.addEventListener('courseSelected', handleCourseSelection as EventListener);
    return () => window.removeEventListener('courseSelected', handleCourseSelection as EventListener);
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('authToken');
        if (!token) {
          router.push('/projects-and-tasks/login');
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        const verifyResponse = await fetch('/api/projects-and-tasks/auth/verify', {
          method: 'GET',
          headers,
        });

        if (!verifyResponse.ok) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          router.push('/projects-and-tasks/login');
          return;
        }

        const verifyData = await verifyResponse.json();
        const lecturerData = verifyData.data.user as LecturerData;
        setLecturer(lecturerData);
        localStorage.setItem('lecturerId', lecturerData._id);

        if (!selectedCourse?._id) {
          setProjects([]);
          setTasks([]);
          setReport(null);
          return;
        }

        const query = new URLSearchParams({
          courseId: selectedCourse._id,
          lecturerId: lecturerData._id,
        });

        const reportQuery = new URLSearchParams({
          courseId: selectedCourse._id,
          itemType: 'all',
        });

        const [projectsResponse, tasksResponse, reportResponse] = await Promise.all([
          fetch(`/api/projects-and-tasks/lecturer/create-projects-and-tasks/project?${query.toString()}`, { headers }),
          fetch(`/api/projects-and-tasks/lecturer/create-projects-and-tasks/task?${query.toString()}`, { headers }),
          fetch(`/api/projects-and-tasks/lecturer/reports?${reportQuery.toString()}`, { headers }),
        ]);

        if (!projectsResponse.ok || !tasksResponse.ok || !reportResponse.ok) {
          throw new Error('Failed to fetch lecturer dashboard data');
        }

        const [projectsData, tasksData, reportData] = await Promise.all([
          projectsResponse.json(),
          tasksResponse.json(),
          reportResponse.json(),
        ]);

        setProjects(projectsData.data?.projects || []);
        setTasks(tasksData.data?.tasks || []);
        setReport(reportData.data || null);
      } catch (fetchError) {
        console.error('Error fetching lecturer dashboard data:', fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDashboard();
  }, [router, selectedCourse?._id]);

  const recentItems = useMemo<LecturerItem[]>(() => {
    const projectItems: LecturerItem[] = projects.map((project) => ({
      _id: project._id,
      name: project.projectName,
      type: 'Project',
      deadlineDate: project.deadlineDate,
      deadlineTime: project.deadlineTime,
      createdAt: project.createdAt,
      published: project.isPublished !== false,
      meta: `${project.assignedGroups?.length || project.assignedGroupIds?.length || 0} groups`,
    }));

    const taskItems: LecturerItem[] = tasks.map((task) => ({
      _id: task._id,
      name: task.taskName,
      type: 'Task',
      deadlineDate: task.deadlineDate,
      deadlineTime: task.deadlineTime,
      createdAt: task.createdAt,
      published: task.isPublished !== false,
      meta: 'Module-wide task',
    }));

    return [...projectItems, ...taskItems]
      .sort((a, b) => {
        const aDeadline = getDeadlineDate(a.deadlineDate, a.deadlineTime)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bDeadline = getDeadlineDate(b.deadlineDate, b.deadlineTime)?.getTime() || Number.MAX_SAFE_INTEGER;
        return aDeadline - bDeadline;
      })
      .slice(0, 5);
  }, [projects, tasks]);

  const dueThisWeek = useMemo(() => {
    const now = Date.now();
    const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
    return [...projects, ...tasks].filter((item) => {
      const deadline = getDeadlineDate(item.deadlineDate, item.deadlineTime);
      return deadline && deadline.getTime() >= now && deadline.getTime() <= weekAhead;
    }).length;
  }, [projects, tasks]);

  const atRiskStudents = useMemo(
    () => (report?.students || []).filter((student) => student.overdue > 0 || student.todo >= 3).length,
    [report]
  );

  const stats = useMemo(
    () => [
      {
        label: 'Active Items',
        value: String(projects.length + tasks.length),
        icon: <Users className="text-blue-600" size={24} />,
        bg: 'bg-blue-50',
      },
      {
        label: 'At-Risk Students',
        value: String(atRiskStudents),
        icon: <AlertCircle className="text-red-600" size={24} />,
        bg: 'bg-red-50',
      },
      {
        label: 'Avg Completion',
        value: `${report?.kpis.completionRate || 0}%`,
        icon: <CheckCircle2 className="text-green-600" size={24} />,
        bg: 'bg-green-50',
      },
      {
        label: 'Due This Week',
        value: String(dueThisWeek),
        icon: <Clock className="text-amber-600" size={24} />,
        bg: 'bg-amber-50',
      },
    ],
    [atRiskStudents, dueThisWeek, projects.length, report?.kpis.completionRate, tasks.length]
  );

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-brand-blue">
          <Loader className="animate-spin" size={32} />
          <p className="font-medium">Loading lecturer dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 text-sm">
        <button
          onClick={() => router.push('/projects-and-tasks/lecturer')}
          className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
        >
          Projects and Tasks
        </button>
        {selectedCourse && (
          <>
            <ChevronRight size={18} className="text-gray-400" />
            <span className="text-gray-700 font-medium">{selectedCourse.courseName}</span>
          </>
        )}
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Lecturer Dashboard
        </h1>
        <p className="text-gray-600">
          {selectedCourse
            ? `${selectedCourse.courseName} • Year ${selectedCourse.year}, Semester ${selectedCourse.semester}`
            : lecturer
              ? `${lecturer.name} • Select a course from the dropdown to view live data`
              : 'Select a course from the dropdown to view live data'}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {!selectedCourse && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertCircle className="text-blue-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">No Course Selected</h3>
            <p className="text-sm text-blue-700 mt-1">
              Click on the module selector in the header to load real projects, tasks, and progress metrics for a course.
            </p>
          </div>
        </div>
      )}

      {selectedCourse && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Upcoming Items
                </h2>

                {recentItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                    No projects or tasks created for this course yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentItems.map((item) => {
                      const priority = getPriority(item.deadlineDate, item.deadlineTime);
                      const badgeClasses =
                        priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : priority === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700';
                      const borderClasses =
                        priority === 'high'
                          ? 'border-red-200'
                          : priority === 'medium'
                            ? 'border-amber-200'
                            : 'border-green-200';

                      return (
                        <div
                          key={item._id}
                          className={`p-4 border rounded-lg transition-colors ${borderClasses}`}
                        >
                          <div className="flex items-start justify-between mb-3 gap-4">
                            <div>
                              <h3 className="font-semibold text-gray-900">{item.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {item.type} • {item.meta}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${badgeClasses}`}>
                              {getDeadlineText(item.deadlineDate, item.deadlineTime)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>{item.published ? 'Published' : 'Draft'}</span>
                            <span>{item.deadlineDate || 'No deadline'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/projects-and-tasks/lecturer/create-projects-and-tasks')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Create Project or Task
                  </button>
                  <button
                    onClick={() => router.push('/projects-and-tasks/lecturer/analytics/trends')}
                    className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors"
                  >
                    View Analytics
                  </button>
                  <button
                    onClick={() => router.push('/projects-and-tasks/lecturer/reports')}
                    className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors"
                  >
                    Generate Report
                  </button>
                </div>
              </div>

              <div className="bg-linear-to-br from-blue-50 to-indigo-100 rounded-lg shadow p-6 border border-blue-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <BarChart3 size={18} className="text-brand-blue" />
                  Course Summary
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  {report
                    ? `${report.kpis.totalStudents} students have ${report.kpis.totalAssigned} assigned items, with ${report.kpis.totalOverdue} currently overdue.`
                    : 'Select a course to load completion and workload metrics.'}
                </p>
                <button
                  onClick={() => router.push('/projects-and-tasks/lecturer/all-projects-and-tasks')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded transition-colors"
                >
                  Review All Projects and Tasks
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
