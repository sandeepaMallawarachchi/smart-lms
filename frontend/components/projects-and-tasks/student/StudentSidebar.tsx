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
} from 'lucide-react';

export default function StudentSidebar() {
  // Hardcoded state
  const [expandedSections, setExpandedSections] = useState<string[]>(['my-tasks']);
  const [activeSection, setActiveSection] = useState('my-tasks');

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
    if (!expandedSections.includes(id)) {
      toggleSection(id);
    }
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-green-900 to-green-800 text-white h-screen overflow-y-auto flex flex-col shadow-lg scrollbar-hide">
      {/* Logo/Branding Section */}
      <div className="p-6 border-b border-green-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center font-bold text-white">
            TM
          </div>
          <div>
            <h2 className="text-lg font-bold">Smart LMS</h2>
            <p className="text-xs text-green-200">Task Management</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-green-700 rounded p-2">
            <p className="text-xs text-green-200">Total</p>
            <p className="text-lg font-bold">{taskStats.total}</p>
          </div>
          <div className="bg-green-700 rounded p-2">
            <p className="text-xs text-green-200">Due Soon</p>
            <p className="text-lg font-bold text-amber-300">{taskStats.pending}</p>
          </div>
        </div>
      </div>

      {/* Create Task Button */}
      <div className="px-4 py-4 border-b border-green-700">
        <button className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold py-2.5 rounded-lg transition-colors">
          <Plus size={18} />
          Create Task
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isExpanded = expandedSections.includes(item.id);
          const isActive = activeSection === item.id;

          return (
            <div key={item.id}>
              {/* Main Item */}
              <button
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'text-gray-200 hover:bg-green-700'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={isActive ? 'text-green-100' : 'text-gray-300'}>{item.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className={`text-xs ${isActive ? 'text-green-100' : 'text-green-300'}`}>
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {item.subsections && (
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </div>
              </button>

              {/* Subsections */}
              {item.subsections && isExpanded && (
                <div className="mt-2 ml-4 space-y-1 border-l border-green-600 pl-4">
                  {item.subsections.map((subsection) => (
                    <button
                      key={subsection.id}
                      className="w-full text-left px-3 py-2 text-sm text-green-200 hover:text-white hover:bg-green-700 rounded transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowRight size={14} />
                        {subsection.label}
                      </div>
                      {subsection.badge && (
                        <span className="text-xs bg-green-600 px-2 py-0.5 rounded-full font-semibold">
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
      </nav>

      {/* Study Tips Section */}
      <div className="p-4 border-t border-green-700 space-y-3">
        <div className="bg-green-700 rounded-lg p-3">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Lightbulb size={16} />
            Daily Tip
          </h3>
          <p className="text-xs text-green-100 mb-3">
            Break large tasks into smaller subtasks. This helps you stay organized and track progress more effectively.
          </p>
          <button className="w-full bg-green-500 hover:bg-green-400 text-white text-xs font-semibold py-2 rounded transition-colors">
            Learn More
          </button>
        </div>
        <button className="w-full text-center text-xs text-green-300 hover:text-green-200 py-2 transition-colors">
          Keyboard Shortcuts
        </button>
      </div>
    </aside>
  );
}