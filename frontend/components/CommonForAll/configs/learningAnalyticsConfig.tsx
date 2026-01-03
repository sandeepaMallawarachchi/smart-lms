import React from 'react';
import {
  LayoutGrid,
  Trello,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  BarChart3,
  Lightbulb,
  LayoutDashboard,
  ListTodo,
  Settings,
  FileText,
  TrendingUp,
  Award,
  Target,
  BookOpen,
} from 'lucide-react';

interface SubSection {
  id: string;
  label: string;
  badge?: number;
  href?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  badge?: number | string;
  href?: string;
  subsections?: SubSection[];
}

interface Notification {
  id: number;
  message: string;
  time: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  icon: React.ComponentType<any>;
}

interface SidebarConfig {
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

interface HeaderConfig {
  courseCode: string;
  courseName: string;
  searchPlaceholder: string;
  avatarColor: string;
  primaryColor: string;
  notifications: Notification[];
  showPendingTasks?: boolean;
  pendingTasksCount?: number;
}

interface ModuleConfig {
  header: HeaderConfig;
  sidebar: SidebarConfig;
}

export const learningAnalyticsConfig: Record<'student' | 'lecture', ModuleConfig> = {
  student: {
    header: {
      courseCode: 'IT22001',
      courseName: 'Learning Analytics - Software Engineering',
      searchPlaceholder: 'Search insights, progress, analytics...',
      avatarColor: 'from-green-500 to-green-600',
      primaryColor: 'green',
      showPendingTasks: true,
      pendingTasksCount: 3,
      notifications: [
        {
          id: 1,
          message: 'Your completion rate improved by 15%',
          time: '2 hours ago',
          type: 'success',
          icon: AlertCircle,
        },
        {
          id: 2,
          message: 'New achievement unlocked: Fast Learner',
          time: '1 hour ago',
          type: 'info',
          icon: Clock,
        },
        {
          id: 3,
          message: 'Weekly learning goal almost reached',
          time: '30 minutes ago',
          type: 'warning',
          icon: AlertCircle,
        },
      ],
    },
    sidebar: {
      showStats: true,
      stats: {
        total: 85,
        dueSoon: 15,
      },
      navItems: [
        {
          id: 'dashboard',
          label: 'Analytics Dashboard',
          icon: <LayoutDashboard size={20} />,
          description: 'Your learning overview',
          href: '/learning-analytics/student',
          subsections: [
            { id: 'overview', label: 'Overview', href: '/learning-analytics/student/' },
            { id: 'weekly-summary', label: 'Weekly Summary' },
            { id: 'monthly-report', label: 'Monthly Report' },
          ],
        },
        {
          id: 'progress',
          label: 'Learning Progress',
          icon: <TrendingUp size={20} />,
          description: 'Track your growth',
          badge: 2,
          href: '/learning-analytics/student/progress',
          subsections: [
            { id: 'course-progress', label: 'Course Progress' },
            { id: 'skill-development', label: 'Skill Development' },
            { id: 'time-spent', label: 'Time Analytics' },
          ],
        },
        {
          id: 'performance',
          label: 'Performance Metrics',
          icon: <BarChart3 size={20} />,
          description: 'Your achievements',
          href: '/learning-analytics/student/performance',
          subsections: [
            { id: 'grades', label: 'Grades & Scores' },
            { id: 'assignments', label: 'Assignment Stats' },
            { id: 'participation', label: 'Participation' },
          ],
        },
        {
          id: 'achievements',
          label: 'Achievements',
          icon: <Award size={20} />,
          description: 'Your milestones',
          badge: 3,
          href: '/learning-analytics/student/achievements',
          subsections: [
            { id: 'badges', label: 'Badges Earned', badge: 3 },
            { id: 'certificates', label: 'Certificates' },
            { id: 'leaderboard', label: 'Leaderboard' },
          ],
        },
        {
          id: 'comparisons',
          label: 'Peer Comparison',
          icon: <Users size={20} />,
          description: 'Compare with classmates',
          href: '/learning-analytics/student/comparisons',
          subsections: [
            { id: 'class-average', label: 'Class Average' },
            { id: 'percentile-rank', label: 'Percentile Rank' },
            { id: 'top-performers', label: 'Top Performers' },
          ],
        },
        {
          id: 'insights',
          label: 'Learning Insights',
          icon: <Lightbulb size={20} />,
          description: 'AI-powered recommendations',
          badge: 4,
          href: '/learning-analytics/student/insights',
          subsections: [
            { id: 'recommendations', label: 'Recommendations', badge: 4 },
            { id: 'weak-areas', label: 'Areas to Improve' },
            { id: 'strengths', label: 'Your Strengths' },
          ],
        },
        {
          id: 'goals',
          label: 'Learning Goals',
          icon: <Target size={20} />,
          description: 'Set and track goals',
          href: '/learning-analytics/student/goals',
          subsections: [
            { id: 'active-goals', label: 'Active Goals' },
            { id: 'completed-goals', label: 'Completed Goals' },
            { id: 'create-goal', label: 'Create New Goal' },
          ],
        },
        {
          id: 'reports',
          label: 'My Reports',
          icon: <FileText size={20} />,
          description: 'Download your analytics',
          href: '/learning-analytics/student/reports',
          subsections: [
            { id: 'progress-report', label: 'Progress Report' },
            { id: 'attendance-report', label: 'Attendance Report' },
            { id: 'export-data', label: 'Export Data' },
          ],
        },
      ],
      showTip: true,
      tipContent: {
        title: 'Learning Tip',
        description: 'Review your weekly analytics every Monday to set clear goals for the week ahead.',
      },
    },
  },
  lecture: {
    header: {
      courseCode: 'IT22001',
      courseName: 'Learning Analytics - Software Engineering',
      searchPlaceholder: 'Search students, analytics, insights...',
      avatarColor: 'from-blue-500 to-blue-600',
      primaryColor: 'blue',
      notifications: [
        {
          id: 1,
          message: 'Class average improved by 12%',
          time: '2 hours ago',
          type: 'success',
          icon: AlertCircle,
        },
        {
          id: 2,
          message: '3 students need attention',
          time: '1 hour ago',
          type: 'warning',
          icon: AlertCircle,
        },
        {
          id: 3,
          message: 'New analytics report available',
          time: '30 minutes ago',
          type: 'info',
          icon: Clock,
        },
      ],
    },
    sidebar: {
      roleLabel: 'Lecturer',
      navItems: [
        {
          id: 'dashboard',
          label: 'Analytics Dashboard',
          icon: <LayoutDashboard size={22} />,
          href: '/learning-analytics/lecturer/dashboard',
        },
        {
          id: 'class-performance',
          label: 'Class Performance',
          icon: <BarChart3 size={22} />,
          href: '/learning-analytics/lecturer/class-performance',
          subsections: [
            { id: 'overview', label: 'Overview' },
            { id: 'grade-distribution', label: 'Grade Distribution' },
            { id: 'trends', label: 'Performance Trends' },
          ],
        },
        {
          id: 'student-insights',
          label: 'Student Insights',
          icon: <Users size={22} />,
          badge: 3,
          href: '/learning-analytics/lecturer/student-insights',
          subsections: [
            { id: 'individual-progress', label: 'Individual Progress' },
            { id: 'at-risk-students', label: 'At-Risk Students', badge: 3 },
            { id: 'top-performers', label: 'Top Performers' },
          ],
        },
        {
          id: 'predictive',
          label: 'Predictive Analytics',
          icon: <TrendingUp size={22} />,
          badge: 2,
          href: '/learning-analytics/lecturer/predictive',
          subsections: [
            { id: 'risk-prediction', label: 'Risk Prediction', badge: 2 },
            { id: 'success-forecasting', label: 'Success Forecasting' },
            { id: 'intervention-suggestions', label: 'Interventions' },
          ],
        },
        {
          id: 'learning-paths',
          label: 'Learning Paths',
          icon: <BookOpen size={22} />,
          href: '/learning-analytics/lecturer/learning-paths',
          subsections: [
            { id: 'curriculum-effectiveness', label: 'Curriculum Effectiveness' },
            { id: 'content-gaps', label: 'Content Gaps' },
            { id: 'optimization', label: 'Path Optimization' },
          ],
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: <FileText size={22} />,
          href: '/learning-analytics/lecturer/reports',
          subsections: [
            { id: 'class-summary', label: 'Class Summary' },
            { id: 'individual-reports', label: 'Individual Reports' },
            { id: 'export-data', label: 'Export Data' },
          ],
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <Settings size={22} />,
          href: '/learning-analytics/lecturer/settings',
          subsections: [
            { id: 'analytics-preferences', label: 'Analytics Preferences' },
            { id: 'notification-settings', label: 'Notifications' },
            { id: 'data-privacy', label: 'Data Privacy' },
          ],
        },
      ],
    },
  },
};