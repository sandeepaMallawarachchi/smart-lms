'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectAndTasksManagementModule() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyUserAndNavigate = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');

        if (!token) {
          // User is not logged in, redirect to login
          router.push('/projects-and-tasks/login');
          return;
        }

        // Verify token with backend
        const response = await fetch('/api/projects-and-tasks/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // Token is invalid or expired
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          router.push('/projects-and-tasks/login');
          return;
        }

        const data = await response.json();
        const userRole = data.data?.userRole;

        if (!userRole) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          router.push('/projects-and-tasks/login');
          return;
        }

        // Store user role for future reference
        localStorage.setItem('userRole', userRole);

        // Navigate based on user role
        if (userRole === 'student') {
          router.push('/projects-and-tasks/student');
        } else if (userRole === 'lecture') {
          router.push('/projects-and-tasks/lecturer');
        } else {
          setError('Invalid user role');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error verifying user:', error);
        setError('An error occurred while verifying your session');
        setIsLoading(false);
      }
    };

    verifyUserAndNavigate();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin">
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
          </div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4">
            <svg
              className="h-12 w-12 text-red-600 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0-10.5a8.5 8.5 0 110 17 8.5 8.5 0 010-17z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return null;
}