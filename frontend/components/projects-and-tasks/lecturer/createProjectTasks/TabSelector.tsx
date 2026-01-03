// /components/projects-and-tasks/lecturer/createProjectTasks/TabSelector.tsx

'use client';

import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';

interface TabSelectorProps {
  activeTab: 'project' | 'task';
  onTabChange: (tab: 'project' | 'task') => void;
}

export default function TabSelector({ activeTab, onTabChange }: TabSelectorProps) {
  return (
    <div className="flex gap-4 items-center justify-between border-b border-gray-200 mb-0 pb-0">
      {/* Tabs */}
      <div className="flex gap-4">
        {/* Project Tab */}
        <button
          onClick={() => onTabChange('project')}
          className={`pb-4 px-4 font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'project'
              ? 'text-brand-blue border-b-brand-blue'
              : 'text-gray-600 border-b-transparent hover:text-gray-900'
          }`}
        >
          <FileText size={20} />
          Create Project
        </button>

        {/* Task Tab */}
        <button
          onClick={() => onTabChange('task')}
          className={`pb-4 px-4 font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'task'
              ? 'text-brand-blue border-b-brand-blue'
              : 'text-gray-600 border-b-transparent hover:text-gray-900'
          }`}
        >
          <CheckCircle2 size={20} />
          Create Task
        </button>
      </div>

      {/* Use Template Button */}
      <div className="flex items-center">
        <button
          disabled
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
          title="Coming soon - will allow creating from templates"
        >
          📋 Use Template
        </button>
      </div>
    </div>
  );
}