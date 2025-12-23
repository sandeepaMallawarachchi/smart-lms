'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  ListTodo,
  BarChart3,
  Users,
  AlertCircle,
  Settings,
  FileText,
  ChevronDown,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function LecturerSidebar() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['dashboard']);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    href?: string;
    subsections?: { id: string; label: string; href?: string }[];
  }

  const navItems: NavItem[] = [
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
        { id: 'all-projects', label: 'All Projects' },
        { id: 'create-project', label: 'Create Project' },
        { id: 'templates', label: 'Templates' },
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
  ];

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNavigate = (id: string, hasSubsections: boolean) => {
    setActiveSection(id);
    if (hasSubsections) {
      toggleSection(id);
    }
  };

  return (
      <aside
      className={`h-full bg-blue-50 border-t-4 border-brand-yellow flex flex-col overflow-y-auto scrollbar-hide shadow-sm transition-all duration-300 ${sidebarCollapsed ? 'w-24' : 'w-72'
        }`}
           style={{ borderRight: '1px solid #242d66' }}
    >
      {/* Header */}
      <div className="sticky top-0 px-6 py-5 border-b border-gray-200 bg-white shadow-md">
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 bg-white">
            {/* <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-md">
              PM
            </div> */}
            {!sidebarCollapsed && (
              <div className="flex-1">
                <img
                  src="/logo1.png"
                  alt="logo"
                  className="w-fit h-17 object-cover "
                />
                <div className='mx-auto mt-2 w-fit px-4 rounded-full bg-blue-100'>
                  <p className="text-lg text-center text-brand-blue font-medium">Lecturer</p>
                </div>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 text-brand-blue hover:text-brand-yellow hover:bg-gray-100 rounded-lg transition-colors duration-200"
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 pr-4 space-y-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
        {navItems.map((item) => {
          const isExpanded = expandedSections.includes(item.id);
          const isActive = activeSection === item.id;
          const hasSubsections = item.subsections && item.subsections.length > 0;

          return (
            <div key={item.id}>
              {/* Main Item */}
              <button
                onClick={() => handleNavigate(item.id, !!hasSubsections)}
                className={`w-full flex items-center justify-between pl-6 px-2 py-3 rounded-r-full transition-all duration-200 group ${isActive
                    ? 'bg-brand-yellow text-white shadow-lg rounded-r-full'
                    : 'text-brand-blue hover:bg-brand-blue/10 hover:text-brand-yellow'
                  } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={sidebarCollapsed ? item.label : ''}
              >
                {/* Icon */}
                <span
                  className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-blue-100' : 'text-brand-blue group-hover:text-brand-yellow'
                    }`}
                >
                  {item.icon}
                </span>

                {/* Text & Badge */}
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2 flex-1 min-w-0 ml-3">
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    {item.badge && (
                      <span className="inline-flex items-center justify-center min-w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex-shrink-0 ml-auto">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* Chevron */}
                {hasSubsections && !sidebarCollapsed && (
                  <ChevronDown
                    size={16}
                    className={`text-brand-blue transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''
                      }`}
                  />
                )}
              </button>

              {/* Submenu */}
              {hasSubsections && isExpanded && !sidebarCollapsed && (
                <div className="mt-2 ml-4 space-y-1 border-l border-yellow-500 pl-4">
                  {item.subsections.map((subsection) => (
                    <button
                      key={subsection.id}
                      className="w-full text-left px-4 py-2 text-sm text-blue-800 hover:text-brand-yellow hover:bg-brand-blue/10 rounded-full transition-colors duration-150"
                    >
                      {subsection.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
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