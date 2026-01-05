'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import UnifiedHeader from '@/components/CommonForAll/Dashboard/UnifiedHeader';
import UnifiedSidebar from '@/components/CommonForAll/Dashboard/UnifiedSidebar';

interface ModuleLayoutProps {
  children: React.ReactNode;
}

export default function ModuleLayout({ children }: ModuleLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<'student' | 'lecture' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const token = localStorage.getItem('authToken');

        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          router.push('/login');
          return;
        }

        const data = await response.json();
        const role = data.data?.userRole;

        if (!role || (role !== 'student' && role !== 'lecture')) {
          router.push('/login');
          return;
        }

        setUserRole(role);
        
        // Redirect if user is on wrong path
        if (pathname.includes('/student') && role !== 'student') {
          router.push(pathname.replace('/student', '/lecturer'));
        } else if (pathname.includes('/lecturer') && role !== 'lecture') {
          router.push(pathname.replace('/lecturer', '/student'));
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error verifying user:', error);
        router.push('/login');
      }
    };

    verifyUser();
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <svg
              className="h-12 w-12 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userRole) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="shrink-0">
        <UnifiedSidebar userRole={userRole} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <UnifiedHeader userRole={userRole} />

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