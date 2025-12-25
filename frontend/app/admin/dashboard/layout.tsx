'use client';

import React, { useState } from 'react';
import UnifiedHeader from '@/components/CommonForAll/Dashboard/UnifiedHeader';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const handleSidebarToggle = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            {/* <div className="flex-shrink-0">
           <UnifiedSidebard />
         </div> */}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <UnifiedHeader userRole="superadmin" />

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