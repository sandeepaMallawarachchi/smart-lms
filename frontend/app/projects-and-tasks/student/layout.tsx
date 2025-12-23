'use client';

import React, { useState } from 'react';
import StudentHeader from '@/components/projects-and-tasks/student/StudentHeader';
import StudentSidebar from '@/components/projects-and-tasks/student/StudentSidebar';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Full Height */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-gradient-to-b from-green-900 to-green-800 flex flex-col`}
      >
        <StudentSidebar />         
      </div>

      {/* Right Side - Header + Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <StudentHeader />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}