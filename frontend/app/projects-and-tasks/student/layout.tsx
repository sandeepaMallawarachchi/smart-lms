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
     <div className="flex h-screen bg-gray-50 overflow-hidden">
         {/* Sidebar */}
         <div className="flex-shrink-0">
           <StudentSidebar />
         </div>
   
         {/* Main Content */}
         <div className="flex-1 flex flex-col overflow-hidden">
           {/* Header */}
           <StudentHeader />
   
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