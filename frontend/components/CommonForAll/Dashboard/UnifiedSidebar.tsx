'use client';

import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  Trello,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  BarChart3,
  Lightbulb,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  LayoutDashboard,
  ListTodo,
  Settings,
  FileText,
  HelpCircle,
  Database,
  Shield,
  Activity,
  UserCog,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type UserRole = 'student' | 'lecture' | 'superadmin';

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

interface RoleConfig {
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

const roleConfigs: Record<UserRole, RoleConfig> = {
  student: {
    showStats: true,
    stats: {
      total: 12,
      dueSoon: 5,
    },
    navItems: [
      {
        id: 'my-tasks',
        label: 'My Tasks',
        icon: <LayoutGrid size={20} />,
        description: 'Your personal task board',
        badge: 5,
        href: '/student/tasks',
        subsections: [
          { id: 'all-tasks', label: 'All Tasks', badge: 12 },
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
        href: '/student/projects',
        subsections: [
          { id: 'active-projects', label: 'Active Projects' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'archived', label: 'Archived' },
        ],
      },
      {
        id: 'deadlines',
        label: 'Upcoming Deadlines',
        icon: <Clock size={20} />,
        description: 'Timeline & reminders',
        badge: 5,
        href: '/student/deadlines',
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
        href: '/student/at-risk',
      },
      {
        id: 'team-view',
        label: 'Team Collaboration',
        icon: <Users size={20} />,
        description: 'See team progress',
        href: '/student/team',
        subsections: [
          { id: 'team-members', label: 'Team Members' },
          { id: 'team-workload', label: 'Workload Distribution' },
          { id: 'team-timeline', label: 'Team Timeline' },
          { id: 'comments', label: 'Comments & Updates' },
        ],
      },
      {
        id: 'analytics',
        label: 'My Progress',
        icon: <BarChart3 size={20} />,
        description: 'Performance insights',
        href: '/student/progress',
        subsections: [
          { id: 'completion-rate', label: 'Completion Rate' },
          { id: 'productivity-trends', label: 'Productivity Trends' },
          { id: 'time-management', label: 'Time Management' },
        ],
      },
      {
        id: 'help',
        label: 'Tips & Learning',
        icon: <Lightbulb size={20} />,
        description: 'How to manage tasks effectively',
        href: '/student/help',
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
  lecture: {
    roleLabel: 'Lecturer',
    navItems: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard size={22} />,
        href: '/lecturer/dashboard',
      },
      {
        id: 'projects',
        label: 'Projects & Tasks',
        icon: <ListTodo size={22} />,
        href: '/lecturer/projects',
        subsections: [
          { id: 'all-projects', label: 'All Projects', href: '/lecturer/projects' },
          { id: 'create-project', label: 'Create Project', href: '/lecturer/projects' },
          { id: 'templates', label: 'Templates', href: '/lecturer/projects' },
        ],
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: <BarChart3 size={22} />,
        badge: 3,
        href: '/lecturer/analytics',
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
        href: '/lecturer/teams',
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
        href: '/lecturer/interventions',
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
        href: '/lecturer/reports',
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
        href: '/lecturer/settings',
        subsections: [
          { id: 'notification-settings', label: 'Notifications' },
          { id: 'assignment-linking', label: 'Assignments' },
          { id: 'grading-rubrics', label: 'Grading' },
        ],
      },
    ],
  },
  superadmin: {
    roleLabel: 'Super Admin',
    navItems: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard size={22} />,
        href: '/admin/',
      },
      {
        id: 'user-management',
        label: 'User Management',
        icon: <UserCog size={22} />,
        badge: 0,
        href: '/admin/users',
        subsections: [
          { id: 'all-users', label: 'All Users', href: '/admin/users' },
          { id: 'students', label: 'Students', href: '/admin/users?filter=students' },
          { id: 'lecturers', label: 'Lecturers', href: '/admin/users?filter=lecturers' },
          { id: 'pending-approvals', label: 'Pending Approvals', href: '/admin/users?filter=pending', badge: 0 },
        ],
      },
      {
        id: 'courses',
        label: 'Course Management',
        icon: <ListTodo size={22} />,
        href: '/admin/courses',
        subsections: [
          { id: 'all-courses', label: 'All Courses' },
          { id: 'create-course', label: 'Create Course' },
          { id: 'archived-courses', label: 'Archived' },
        ],
      },
      {
        id: 'system-analytics',
        label: 'System Analytics',
        icon: <Activity size={22} />,
        href: '/admin/analytics',
        subsections: [
          { id: 'platform-usage', label: 'Platform Usage' },
          { id: 'performance-metrics', label: 'Performance' },
          { id: 'user-engagement', label: 'Engagement' },
        ],
      },
      {
        id: 'database',
        label: 'Database',
        icon: <Database size={22} />,
        href: '/admin/database',
        subsections: [
          { id: 'backups', label: 'Backups' },
          { id: 'data-integrity', label: 'Data Integrity' },
          { id: 'maintenance', label: 'Maintenance' },
        ],
      },
      {
        id: 'security',
        label: 'Security & Logs',
        icon: <Shield size={22} />,
        badge: 2,
        href: '/admin/security',
        subsections: [
          { id: 'access-logs', label: 'Access Logs' },
          { id: 'security-alerts', label: 'Security Alerts', badge: 2 },
          { id: 'permissions', label: 'Permissions' },
        ],
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: <FileText size={22} />,
        href: '/admin/reports',
        subsections: [
          { id: 'system-reports', label: 'System Reports' },
          { id: 'user-reports', label: 'User Reports' },
          { id: 'export-data', label: 'Export Data' },
        ],
      },
      {
        id: 'settings',
        label: 'System Settings',
        icon: <Settings size={22} />,
        href: '/admin/settings',
        subsections: [
          { id: 'general-settings', label: 'General' },
          { id: 'email-settings', label: 'Email Config' },
          { id: 'notification-settings', label: 'Notifications' },
          { id: 'backup-settings', label: 'Backup Config' },
        ],
      },
    ],
  },
};

interface UnifiedSidebarProps {
  userRole: UserRole;
}

export default function UnifiedSidebar({ userRole }: UnifiedSidebarProps) {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<string[]>(['dashboard', 'my-tasks']);
  const [activeSection, setActiveSection] = useState(userRole === 'student' ? 'my-tasks' : 'dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNavigate = (id: string, hasSubsections: boolean, href?: string) => {
    setActiveSection(id);
    if (hasSubsections && !sidebarCollapsed) {
      toggleSection(id);
    } else if (href) {
      router.push(href);
    }
  };

  useEffect(() => {
    if (userRole === 'superadmin') {
      fetchPendingCount();
    }
  }, [userRole]);

  const fetchPendingCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/users/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.data.total);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const config = roleConfigs[userRole];

  // Update the config to use dynamic badge count
  const updatedNavItems = config.navItems.map(item => {
    if (userRole === 'superadmin' && item.id === 'user-management') {
      return {
        ...item,
        badge: pendingCount,
        subsections: item.subsections?.map(sub =>
          sub.id === 'pending-approvals'
            ? { ...sub, badge: pendingCount }
            : sub
        ),
      };
    }
    return item;
  });

  return (
    <aside
      className={`h-full bg-blue-50 border-t-4 border-brand-yellow flex flex-col overflow-y-auto scrollbar-hide shadow-sm transition-all duration-300 ${sidebarCollapsed ? 'w-24' : 'w-72'
        }`}
    >
      <div className="sticky z-20 top-0 px-6 py-5 border-b border-gray-200 bg-white shadow-md shrink-0">
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 bg-white">
            {!sidebarCollapsed && (
              <div className="flex-1">
                <img src="/logo1.png" alt="logo" className="w-fit h-17 object-cover" />
                {config.roleLabel && (
                  <div className="mx-auto mt-2 w-fit px-4 rounded-full bg-blue-100">
                    <p className="text-lg text-center text-brand-blue font-medium">{config.roleLabel}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 text-brand-blue hover:text-brand-yellow hover:bg-gray-100 rounded-lg transition-colors duration-200 shrink-0"
              title="Collapse"
            >
              <ChevronLeft size={24} />
            </button>
          )}
        </div>
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="mt-3 w-full p-1.5 text-brand-blue hover:text-brand-yellow hover:bg-gray-100 rounded-lg transition-colors duration-200 flex justify-center"
            title="Expand"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {config.showStats && !sidebarCollapsed && config.stats && (
          <div className="grid grid-cols-2 gap-2 text-center mt-4">
            <div className="bg-blue-300 rounded p-2">
              <p className="text-xs text-brand-blue font-bold">Total</p>
              <p className="text-lg font-bold text-white">{config.stats.total}</p>
            </div>
            <div className="bg-blue-300 rounded p-2">
              <p className="text-xs text-brand-blue font-bold">Due Soon</p>
              <p className="text-lg font-bold text-red-500">{config.stats.dueSoon}</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 pr-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
        {updatedNavItems.map((item) => {
          const isExpanded = expandedSections.includes(item.id);
          const isActive = activeSection === item.id;
          const hasSubsections = item.subsections && item.subsections.length > 0;

          return (
            <div key={item.id}>
              <button
                onClick={() => handleNavigate(item.id, !!hasSubsections, item.href)}
                className={`w-full flex items-center pl-6 px-2 py-3 rounded-r-full transition-all ${isActive
                  ? 'bg-brand-yellow text-brand-blue shadow-lg rounded-r-full'
                  : 'text-brand-blue hover:bg-brand-blue/10'
                  }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className={isActive ? 'text-brand-blue' : 'text-brand-blue'}>{item.icon}</span>

                {!sidebarCollapsed && (
                  <div className="text-left min-w-0 flex-1 ml-3">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    {item.description && (
                      <p className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-brand-yellow'}`}>
                        {item.description}
                      </p>
                    )}
                  </div>
                )}

                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    {item.badge && typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                        {item.badge}
                      </span>
                    )}
                    {hasSubsections && (
                      <ChevronDown
                        size={16}
                        className={`transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </div>
                )}
              </button>

              {hasSubsections && isExpanded && !sidebarCollapsed && (
                <div className="mt-2 ml-4 space-y-1 border-l border-yellow-500 pl-4 animate-in fade-in duration-200">
                  {item.subsections!.map((subsection) => (
                    <button
                      key={subsection.id}
                      onClick={() => {
                        if (subsection.href) {
                          router.push(subsection.href);
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-blue-800 hover:text-brand-yellow hover:bg-brand-blue/10 rounded-full transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ArrowRight size={14} className="shrink-0" />
                        <span className="truncate">{subsection.label}</span>
                      </div>
                      {subsection.badge && (
                        <span className="text-xs bg-red-100 px-2 py-1 text-red-600 rounded-full font-semibold whitespace-nowrap ml-2">
                          {subsection.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {config.showTip && !sidebarCollapsed && config.tipContent && (
          <div className="p-4 border-t border-yellow-400 space-y-3 shrink-0">
            <div className="bg-blue-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold mb-2 text-brand-blue flex items-center gap-2">
                <Lightbulb size={16} />
                {config.tipContent.title}
              </h3>
              <p className="text-xs text-brand-blue/70 mb-3">{config.tipContent.description}</p>
              <button className="w-full bg-brand-blue hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded transition-colors">
                Learn More
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-gray-200">
        {!sidebarCollapsed ? (
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200 group text-sm font-medium">
            <HelpCircle size={18} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
            <span>Help & Support</span>
          </button>
        ) : (
          <button
            className="w-full p-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200 group flex justify-center"
            title="Help & Support"
          >
            <HelpCircle size={18} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
          </button>
        )}
      </div>
    </aside>
  );
}