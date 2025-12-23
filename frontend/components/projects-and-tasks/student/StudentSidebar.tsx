'use client';

import React, { useState } from 'react';
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
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function StudentSidebar() {
  // Hardcoded state
  const [expandedSections, setExpandedSections] = useState<string[]>(['my-tasks']);
  const [activeSection, setActiveSection] = useState('my-tasks');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Hardcoded data
  const taskStats = {
    total: 12,
    inProgress: 4,
    pending: 5,
    completed: 3,
  };

  interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    description: string;
    badge?: number | string;
    href?: string;
    subsections?: { id: string; label: string; badge?: number }[];
  }

  const navItems: NavItem[] = [
    {
      id: 'my-tasks',
      label: 'My Tasks',
      icon: <LayoutGrid size={20} />,
      description: 'Your personal task board',
      badge: taskStats.pending,
      href: '/student/tasks',
      subsections: [
        { id: 'all-tasks', label: 'All Tasks', badge: taskStats.total },
        { id: 'in-progress', label: 'In Progress', badge: taskStats.inProgress },
        { id: 'pending', label: 'Pending', badge: taskStats.pending },
        { id: 'completed', label: 'Completed', badge: taskStats.completed },
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
  ];

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNavigate = (id: string) => {
    setActiveSection(id);
    // Only toggle if sidebar is expanded
    if (!sidebarCollapsed) {
      toggleSection(id);
    }
  };

  return (
    <aside
      className={`h-full bg-blue-50 border-t-4 border-brand-yellow flex flex-col overflow-y-auto scrollbar-hide shadow-sm transition-all duration-300 ${sidebarCollapsed ? 'w-24' : 'w-72'
        }`}
      style={{ borderRight: '2px solid #242d66' }}
    >
      {/* Header */}
      <div className="sticky z-20 top-0 px-6 py-5 border-b border-gray-200 bg-white shadow-md shrink-0">
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 bg-white">
            {!sidebarCollapsed && (
              <div className="flex-1">
                <img
                  src="/logo1.png"
                  alt="logo"
                  className="w-fit h-17 object-cover"
                />
                <div className="mx-auto mt-2 w-fit px-4 rounded-full bg-blue-100">
                  {/* <p className="text-lg text-center text-brand-blue font-medium">Lecturer</p> */}
                </div>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 text-brand-blue hover:text-brand-yellow hover:bg-gray-100 rounded-lg transition-colors duration-200 flex-shrink-0"
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

        {/* Quick Stats - only show when expanded */}
        {!sidebarCollapsed && (
          <div className="grid grid-cols-2 gap-2 text-center mt-4">
            <div className="bg-blue-300 rounded p-2">
              <p className="text-xs text-brand-blue font-bold">Total</p>
              <p className="text-lg font-bold text-white">{taskStats.total}</p>
            </div>
            <div className="bg-blue-300 rounded p-2">
              <p className="text-xs text-brand-blue font-bold">Due Soon</p>
              <p className="text-lg font-bold text-red-500">{taskStats.pending}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isExpanded = expandedSections.includes(item.id);
          const isActive = activeSection === item.id;

          return (
            <div key={item.id}>
              {/* Main Item */}
              <button
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center pl-4 px-1 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-brand-yellow text-brand-blue shadow-lg'
                    : 'text-brand-blue hover:bg-brand-blue/10'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {/* Icon */}
                <span className={isActive ? 'text-brand-blue' : 'text-brand-blue'}>{item.icon}</span>
                
                {/* Label & Description */}
                {!sidebarCollapsed && (
                  <div className="text-left min-w-0 flex-1 ml-3">
                    <p className="text-sm font-semibold truncate">{item.label}</p>
                    <p className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-brand-yellow'}`}>
                      {item.description}
                    </p>
                  </div>
                )}
                
                {/* Badge & Chevron - always aligned to the right */}
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    {item.badge && typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                        {item.badge}
                      </span>
                    )}
                    {item.subsections && (
                      <ChevronDown
                        size={16}
                        className={`transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </div>
                )}
              </button>

              {/* Subsections - only render when expanded AND sidebar is expanded */}
              {item.subsections && isExpanded && !sidebarCollapsed && (
                <div className="mt-2 ml-4 space-y-1 border-l border-yellow-500 pl-4 animate-in fade-in duration-200">
                  {item.subsections.map((subsection) => (
                    <button
                      key={subsection.id}
                      className="w-full text-left px-3 py-2 text-sm text-blue-800 hover:text-brand-yellow hover:bg-brand-blue/10 rounded transition-colors flex items-center justify-between"
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

        {/* Study Tips Section - only show when expanded */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-yellow-400 space-y-3 shrink-0">
            <div className="bg-blue-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold mb-2 text-brand-blue flex items-center gap-2">
                <Lightbulb size={16} />
                Daily Tip
              </h3>
              <p className="text-xs text-brand-blue/70 mb-3">
                Break large tasks into smaller subtasks. This helps you stay organized and track progress more effectively.
              </p>
              <button className="w-full bg-brand-blue hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded transition-colors">
                Learn More
              </button>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}