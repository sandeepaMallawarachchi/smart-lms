'use client';

import React from 'react';
import LecturerHeader from '@/components/projects-and-tasks/lecturer/LecturerHeader';
import LecturerSidebar from '@/components/projects-and-tasks/lecturer/LecturerSidebar';

interface LecturerLayoutProps {
  children: React.ReactNode;
}

export default function LecturerLayout({ children }: LecturerLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <LecturerSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <LecturerHeader />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}