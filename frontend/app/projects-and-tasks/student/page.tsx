'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Loader,
  Plus,
} from 'lucide-react';

interface Course {
  _id: string;
  courseName: string;
  courseCode: string;
  year?: number;
  semester?: number;
}

interface StudentData {
  id: string;
  name: string;
  studentIdNumber: string;
  academicYear: string;
  semester: string;
  specialization: string;
}

interface Subtask {
  id: string;
  title: string;
  completed?: boolean;
}

interface MainTask {
  id: string;
  title: string;
  completed?: boolean;
  subtasks?: Subtask[];
}

interface Project {
  _id: string;
  projectName: string;
  deadlineDate?: string;
  deadlineTime?: string;
  course: Course;
  mainTasks?: MainTask[];
}

interface Task {
  _id: string;
  taskName: string;
  deadlineDate?: string;
  deadlineTime?: string;
  course: Course;
  subtasks?: Subtask[];
}

type ItemStatus = 'todo' | 'inprogress' | 'done';

interface ProgressPayload {
  status?: ItemStatus;
  updatedAt?: string;
  mainTasks?: MainTask[];
  subtasks?: Subtask[];
}

interface DashboardItem {
  _id: string;
  name: string;
  type: 'project' | 'task';
  status: ItemStatus;
  deadlineDate?: string;
  deadlineTime?: string;
  course?: Course;
  progressPercent: number;
}

const getDeadlineDate = (deadlineDate?: string, deadlineTime?: string) => {
  if (!deadlineDate) return null;
  const parsed = new Date(`${deadlineDate}T${deadlineTime || '23:59'}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDeadlineText = (deadlineDate?: string, deadlineTime?: string) => {
  const deadline = getDeadlineDate(deadlineDate, deadlineTime);
  if (!deadline) return 'No deadline';

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDeadline = new Date(deadline);
  startOfDeadline.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((startOfDeadline.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

  if (deadline.getTime() < now.getTime()) {
    const overdueDays = Math.max(1, Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)));
    return `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`;
  }
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

const formatCourseSummary = (student: StudentData | null, courses: Course[]) => {
  if (courses.length === 1) {
    return `${courses[0].courseCode} • ${courses[0].courseName}`;
  }

  if (student) {
    return `Year ${student.academicYear} • Semester ${student.semester} • ${courses.length} courses`;
  }

  return `${courses.length} assigned courses`;
};

const countProjectCompletion = (sourceMainTasks: MainTask[] = [], progressMainTasks: MainTask[] = []) => {
  const progressMap = new Map(progressMainTasks.map((task) => [task.id, task]));
  let total = 0;
  let completed = 0;

  for (const mainTask of sourceMainTasks) {
    const progressTask = progressMap.get(mainTask.id);
    const subtasks = mainTask.subtasks || [];

    if (subtasks.length > 0) {
      for (const subtask of subtasks) {
        total += 1;
        const progressSubtask = progressTask?.subtasks?.find((item) => item.id === subtask.id);
        if (progressSubtask?.completed) {
          completed += 1;
        }
      }
      continue;
    }

    total += 1;
    if (progressTask?.completed) {
      completed += 1;
    }
  }

  return { total, completed };
};

const countTaskCompletion = (sourceSubtasks: Subtask[] = [], progressSubtasks: Subtask[] = []) => {
  const progressMap = new Map(progressSubtasks.map((subtask) => [subtask.id, subtask]));
  let completed = 0;

  for (const subtask of sourceSubtasks) {
    if (progressMap.get(subtask.id)?.completed) {
      completed += 1;
    }
  }

  return { total: sourceSubtasks.length, completed };
};

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('authToken');

        if (!token) {
          router.push('/projects-and-tasks/login');
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        const [projectsResponse, tasksResponse] = await Promise.all([
          fetch('/api/projects-and-tasks/student/projects', { headers }),
          fetch('/api/projects-and-tasks/student/tasks', { headers }),
        ]);

        if (projectsResponse.status === 401 || tasksResponse.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          router.push('/projects-and-tasks/login');
          return;
        }

        if (!projectsResponse.ok || !tasksResponse.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const [projectsData, tasksData] = await Promise.all([
          projectsResponse.json(),
          tasksResponse.json(),
        ]);

        const fetchedStudent = projectsData.data.student || tasksData.data.student || null;
        const fetchedCourses = projectsData.data.courses || tasksData.data.courses || [];
        const projects: Project[] = projectsData.data.projects || [];
        const tasks: Task[] = tasksData.data.tasks || [];

        setStudent(fetchedStudent);
        setCourses(fetchedCourses);

        const [projectItems, taskItems] = await Promise.all([
          Promise.all(
            projects.map(async (project) => {
              const response = await fetch(
                `/api/projects-and-tasks/student/project-progress?projectId=${project._id}`,
                { headers }
              );

              let progress: ProgressPayload = { status: 'todo', mainTasks: [] };
              if (response.ok) {
                const payload = await response.json();
                progress = payload.data.progress || progress;
              }

              const completion = countProjectCompletion(
                project.mainTasks || [],
                progress.mainTasks || []
              );

              return {
                _id: project._id,
                name: project.projectName,
                type: 'project' as const,
                status: progress.status || 'todo',
                deadlineDate: project.deadlineDate,
                deadlineTime: project.deadlineTime,
                course: project.course,
                progressPercent:
                  completion.total > 0
                    ? Math.round((completion.completed / completion.total) * 100)
                    : progress.status === 'done'
                      ? 100
                      : 0,
              };
            })
          ),
          Promise.all(
            tasks.map(async (task) => {
              const response = await fetch(
                `/api/projects-and-tasks/student/task-progress?taskId=${task._id}`,
                { headers }
              );

              let progress: ProgressPayload = { status: 'todo', subtasks: [] };
              if (response.ok) {
                const payload = await response.json();
                progress = payload.data.progress || progress;
              }

              const completion = countTaskCompletion(task.subtasks || [], progress.subtasks || []);

              return {
                _id: task._id,
                name: task.taskName,
                type: 'task' as const,
                status: progress.status || 'todo',
                deadlineDate: task.deadlineDate,
                deadlineTime: task.deadlineTime,
                course: task.course,
                progressPercent:
                  completion.total > 0
                    ? Math.round((completion.completed / completion.total) * 100)
                    : progress.status === 'done'
                      ? 100
                      : 0,
              };
            })
          ),
        ]);

        setItems([...projectItems, ...taskItems]);
        setError(null);
      } catch (fetchError) {
        console.error('Error fetching student dashboard data:', fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDashboardData();
  }, [router]);

  const stats = useMemo(() => {
    const total = items.length;
    const inProgress = items.filter((item) => item.status === 'inprogress').length;
    const pending = items.filter((item) => item.status === 'todo').length;
    const completed = items.filter((item) => item.status === 'done').length;

    return [
      {
        label: 'Total Items',
        value: String(total),
        icon: <BarChart3 size={24} />,
        color: 'blue',
      },
      {
        label: 'In Progress',
        value: String(inProgress),
        icon: <Clock size={24} />,
        color: 'amber',
      },
      {
        label: 'Pending',
        value: String(pending),
        icon: <AlertCircle size={24} />,
        color: 'red',
      },
      {
        label: 'Completed',
        value: String(completed),
        icon: <CheckCircle2 size={24} />,
        color: 'green',
      },
    ];
  }, [items]);

  const upcomingDeadlines = useMemo(
    () =>
      items
        .filter((item) => item.status !== 'done' && item.deadlineDate)
        .sort((a, b) => {
          const aDate = getDeadlineDate(a.deadlineDate, a.deadlineTime)?.getTime() || Number.MAX_SAFE_INTEGER;
          const bDate = getDeadlineDate(b.deadlineDate, b.deadlineTime)?.getTime() || Number.MAX_SAFE_INTEGER;
          return aDate - bDate;
        })
        .slice(0, 5),
    [items]
  );

  const overdueCount = useMemo(
    () =>
      items.filter((item) => {
        const deadline = getDeadlineDate(item.deadlineDate, item.deadlineTime);
        return item.status !== 'done' && deadline !== null && deadline.getTime() < Date.now();
      }).length,
    [items]
  );

  const getStatColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50',
      amber: 'bg-amber-50',
      red: 'bg-red-50',
      green: 'bg-green-50',
    };
    return colors[color] || 'bg-gray-50';
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-brand-blue">
          <Loader className="animate-spin" size={32} />
          <p className="font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-brand-blue mb-2">
          Student Dashboard
        </h1>
        <p className="text-gray-600">
          {student ? `${student.name} • ${formatCourseSummary(student, courses)}` : 'Projects and tasks overview'}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Upcoming Deadlines
            </h2>

            {upcomingDeadlines.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                No pending projects or tasks with upcoming deadlines.
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingDeadlines.map((item) => {
                  const priority = getPriority(item.deadlineDate, item.deadlineTime);
                  const badgeClasses =
                    priority === 'high'
                      ? 'bg-red-100 text-red-700'
                      : priority === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700';
                  const cardClasses =
                    priority === 'high'
                      ? 'bg-red-50 border-red-200'
                      : priority === 'medium'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-blue-50 border-blue-200';

                  return (
                    <div key={item._id} className={`p-4 border rounded-lg ${cardClasses}`}>
                      <div className="flex items-start justify-between mb-3 gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {item.course?.courseCode} • {item.type === 'project' ? 'Project' : 'Task'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${badgeClasses}`}>
                          {getDeadlineText(item.deadlineDate, item.deadlineTime)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${item.progressPercent}%` }}
                        />
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
                onClick={() => router.push('/projects-and-tasks/student/kanban-board')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Open Kanban Board
              </button>
              <button
                onClick={() => router.push('/projects-and-tasks/student/notifications')}
                className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors"
              >
                View Notifications
              </button>
              <button
                onClick={() => router.push('/projects-and-tasks/student/heatmap')}
                className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-lg font-medium transition-colors"
              >
                Activity Heatmap
              </button>
            </div>
          </div>

          <div className="bg-linear-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
            <h3 className="font-bold text-gray-900 mb-3">
              Dashboard Summary
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              {overdueCount > 0
                ? `You have ${overdueCount} overdue item${overdueCount === 1 ? '' : 's'} that need attention.`
                : `You are tracking ${items.length} project and task item${items.length === 1 ? '' : 's'} across ${courses.length} course${courses.length === 1 ? '' : 's'}.`}
            </p>
            <button
              onClick={() => router.push('/projects-and-tasks/student/kanban-board')}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded transition-colors"
            >
              Review Workload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
