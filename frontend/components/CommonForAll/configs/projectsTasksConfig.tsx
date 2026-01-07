import React from 'react';
import {
  LayoutGrid,
  Trello,
  CodeXml,
  Clock,
  AlertCircle,
  Users,
  BarChart3,
  Lightbulb,
  LayoutDashboard,
  ListTodo,
  Settings,
  FileText,
  BellIcon
} from 'lucide-react';

export interface SubSection {
  id: string;
  label: string;
  badge?: number;
  href?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  badge?: number | string;
  href?: string;
  subsections?: SubSection[];
}

export interface Notification {
  id: number;
  message: string;
  time: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  icon: React.ComponentType<any>;
}

export interface SidebarConfig {
  roleLabel?: string;
  showStats?: boolean;
  stats?: {
    total: number;
    dueSoon: number;
  };
  navItems: NavItem[];
  showTip?: boolean;
  tipContent?: {
    title: string;
    description: string;
  };
}

export interface HeaderConfig {
  courseCode: string;
  courseName: string;
  searchPlaceholder: string;
  avatarColor: string;
  primaryColor: string;
  notifications: Notification[];
  showPendingTasks?: boolean;
  pendingTasksCount?: number;
}

export interface ModuleConfig {
  header: HeaderConfig
  sidebar: SidebarConfig
}

export interface Course {
  _id: string
  courseName: string
  credits: number
  year: number
  semester: number
  specializations: string[]
}

export interface CoursesApiResponse {
  success: boolean
  message: string
  data: {
    student: any
    courses: Course[]
    totalCourses: number
  }
}

export const projectsTasksConfig: Record<'student' | 'lecture', ModuleConfig> = {
  student: {
    header: {
      courseCode: 'IT22001',
      courseName: 'Software Engineering - Semester 1',
      searchPlaceholder: 'Search tasks, teammates, projects...',
      avatarColor: 'from-green-500 to-green-600',
      primaryColor: 'green',
      showPendingTasks: true,
      pendingTasksCount: 5,
      notifications: [
        {
          id: 1,
          message: 'Task "UI Design" is overdue',
          time: '2 hours ago',
          type: 'alert',
          icon: AlertCircle,
        },
        {
          id: 2,
          message: 'Reminder: Deadline for "API Integration" in 24 hours',
          time: '1 hour ago',
          type: 'warning',
          icon: Clock,
        },
        {
          id: 3,
          message: 'Team member "Sandhya" commented on "Database Design"',
          time: '30 minutes ago',
          type: 'info',
          icon: AlertCircle,
        },
      ],
    },
    sidebar: {
      showStats: true,
      stats: {
        total: 12,
        dueSoon: 5,
      },
      navItems: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutGrid size={20} />,
          description: 'Your personal task board',
          href: '/projects-and-tasks/student/',
          subsections: [],
        },
        {
          id: 'my-tasks',
          label: 'My Project & Tasks',
          icon: <FileText size={20} />,
          description: 'Your personal project & task board',
          badge: 5,
          href: '/projects-and-tasks/student/tasks',
          subsections: [
            { id: 'all-tasks-projects', label: 'All Projects & Tasks', badge: 12, href: '/projects-and-tasks/student/kanban-board' },
            { id: 'in-progress', label: 'In Progress', badge: 4 },
            { id: 'pending', label: 'Pending', badge: 5 },
            { id: 'completed', label: 'Completed', badge: 3 },
          ],
        },
        {
          id: 'projects',
          label: 'Group Projects',
          icon: <Trello size={20} />,
          description: 'Team collaboration boards',
          badge: 3,
          href: '/projects-and-tasks/student/projects',
          subsections: [
            { id: 'active-projects', label: 'Active Projects' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'archived', label: 'Archived' },
          ],
        },
        {
          id: 'code-projects',
          label: 'Code Assignments',
          icon: <CodeXml size={20} />,
          description: 'Practice coding challenges & labs',
          href: '/projects-and-tasks/student/code-assignments',
          subsections: [

          ],
        },
        {
          id: 'heatmap',
          label: 'Activity Heatmap',
          icon: <AlertCircle size={20} />,
          description: 'Activity HeatMap Overview',
          badge: 1,
          href: '/projects-and-tasks/student/heatmap',
        },
        {
          id: 'deadlines',
          label: 'Upcoming Deadlines',
          icon: <Clock size={20} />,
          description: 'Timeline & reminders',
          badge: 5,
          href: '/projects-and-tasks/student/deadlines',
          subsections: [
            { id: 'this-week', label: 'This Week', badge: 2 },
            { id: 'next-week', label: 'Next Week', badge: 3 },
            { id: 'this-month', label: 'This Month', badge: 5 },
          ],
        },
        {
          id: 'at-risk',
          label: 'Tasks at Risk',
          icon: <AlertCircle size={20} />,
          description: 'Overdue & warnings',
          badge: 1,
          href: '/projects-and-tasks/student/at-risk',
        },
        {
          id: 'team-view',
          label: 'Team Collaboration',
          icon: <Users size={20} />,
          description: 'See team progress',
          href: '/projects-and-tasks/student/team',
          subsections: [
            { id: 'team-members', label: 'Team Members' },
            { id: 'team-workload', label: 'Workload Distribution' },
            { id: 'team-timeline', label: 'Team Timeline' },
            { id: 'comments', label: 'Comments & Updates' },
          ],
        },
        {
          id: 'notifications',
          label: 'Project Notifications',
          icon: <BellIcon size={20} />,
          description: 'Your project notifications',
          href: '/projects-and-tasks/student/notifications',
        },
        {
          id: 'help',
          label: 'Tips & Learning',
          icon: <Lightbulb size={20} />,
          description: 'How to manage tasks effectively',
          href: '/projects-and-tasks/student/help',
          subsections: [
            { id: 'getting-started', label: 'Getting Started' },
            { id: 'kanban-guide', label: 'Kanban Guide' },
            { id: 'best-practices', label: 'Best Practices' },
          ],
        },
      ],
      showTip: true,
      tipContent: {
        title: 'Daily Tip',
        description: 'Break large tasks into smaller subtasks. This helps you stay organized and track progress more effectively.',
      },
    },
  },
  lecture: {
    header: {
      courseCode: 'IT22001',
      courseName: 'Software Engineering - Semester 1',
      searchPlaceholder: 'Search tasks, students, projects...',
      avatarColor: 'from-blue-500 to-blue-600',
      primaryColor: 'blue',
      notifications: [
        {
          id: 1,
          message: 'Team "Group A" has completed milestone 1',
          time: '2 hours ago',
          type: 'success',
          icon: AlertCircle,
        },
        {
          id: 2,
          message: 'Workload imbalance detected in "Group B"',
          time: '1 hour ago',
          type: 'warning',
          icon: AlertCircle,
        },
        {
          id: 3,
          message: 'Task bottleneck in "Project X"',
          time: '30 minutes ago',
          type: 'alert',
          icon: Clock,
        },
      ],
    },
    sidebar: {
      roleLabel: 'Lecturer',
      navItems: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard size={22} />,
          href: '/projects-and-tasks/lecturer/dashboard',
        },
        {
          id: 'projects',
          label: 'Projects & Tasks',
          icon: <ListTodo size={22} />,
          href: '/projects-and-tasks/lecturer/projects',
          subsections: [
            { id: 'all-projects-and-tasks', label: 'All Projects and Tasks', href: '/projects-and-tasks/lecturer/all-projects-and-tasks' },
            { id: 'create-project-and-task', label: 'Create Project and task ', href: '/projects-and-tasks/lecturer/create-projects-and-tasks' },
            { id: 'templates', label: 'Templates', href: '/projects-and-tasks/lecturer/templates' },
          ],
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: <BarChart3 size={22} />,
          badge: 3,
          href: '/projects-and-tasks/lecturer/analytics',
          subsections: [
            { id: 'activity-heatmap', label: 'Activity Heatmap' },
            { id: 'workload-distribution', label: 'Workload' },
            { id: 'completion-trends', label: 'Trends' },
            { id: 'deadline-adherence', label: 'Deadlines' },
          ],
        },
        {
          id: 'teams',
          label: 'Teams',
          icon: <Users size={22} />,
          href: '/projects-and-tasks/lecturer/teams',
          subsections: [
            { id: 'all-teams', label: 'All Teams' },
            { id: 'team-performance', label: 'Performance' },
            { id: 'collaboration-metrics', label: 'Collaboration' },
          ],
        },
        {
          id: 'interventions',
          label: 'Alerts',
          icon: <AlertCircle size={22} />,
          badge: 2,
          href: '/projects-and-tasks/lecturer/interventions',
          subsections: [
            { id: 'at-risk-projects', label: 'At-Risk' },
            { id: 'inactivity-alerts', label: 'Inactivity' },
            { id: 'deadline-warnings', label: 'Warnings' },
          ],
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: <FileText size={22} />,
          href: '/projects-and-tasks/lecturer/reports',
          subsections: [
            { id: 'project-summary', label: 'Summary' },
            { id: 'student-progress', label: 'Progress' },
            { id: 'export-data', label: 'Export' },
          ],
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <Settings size={22} />,
          href: '/projects-and-tasks/lecturer/settings',
          subsections: [
            { id: 'notification-settings', label: 'Notifications' },
            { id: 'assignment-linking', label: 'Assignments' },
            { id: 'grading-rubrics', label: 'Grading' },
          ],
        },
      ],
    },
  },
}

export const updateConfigWithCourses = (
  baseConfig: typeof projectsTasksConfig,
  courses: Course[]
): typeof projectsTasksConfig => {
  
  return {
    ...baseConfig,
    student: {
      ...baseConfig.student,
      sidebar: {
        ...baseConfig.student.sidebar,
        navItems: baseConfig.student.sidebar.navItems.map((item) => {
          if (item.id === 'code-projects') {
            return {
              ...item, 
              subsections: courses.map((course) => ({
                id: course._id,
                label: course.courseName,
                href: `/projects-and-tasks/student/code-assignments/${course._id}`,
              })),
            };
          }
          return item
        }),
      },
    },
  };
};