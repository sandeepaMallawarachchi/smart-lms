'use client';

import React, { useState } from 'react';
import UnifiedHeader from '@/components/CommonForAll/Dashboard/UnifiedHeader';
import UnifiedSidebar from '@/components/CommonForAll/Dashboard/UnifiedSidebar';

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
            <div className="shrink-0">
                <UnifiedSidebar userRole="student" />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <UnifiedHeader userRole="student" />

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