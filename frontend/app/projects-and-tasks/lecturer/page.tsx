'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LecturerData {
  _id: string;
  name: string;
  email: string;
  position: string;
  gender: string;
  dateOfBirth: string;
}

export default function ProjectAndTaskLecturePage() {
  const router = useRouter();
  const [lecturer, setLecturer] = useState<LecturerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndFetchUser = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userRole = localStorage.getItem('userRole');

        if (!token || userRole !== 'lecture') {
          router.push('/projects-and-tasks/login');
          return;
        }

        const response = await fetch('/api/projects-and-tasks/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          router.push('/projects-and-tasks/login');
          return;
        }

        const data = await response.json();
        setLecturer(data.data.user);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Failed to load dashboard');
        setIsLoading(false);
      }
    };

    verifyAndFetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    router.push('/projects-and-tasks/login');
  };

  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      lecture: 'Lecturer',
      instructure: 'Instructor',
      lic: 'Lecturer in Charge',
    };
    return labels[position] || position;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <svg
              className="h-12 w-12 text-yellow-600"
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
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #efa300 0%, #242d66 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
              }}
            >
              PT
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Project & Tasks Manager</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {lecturer?.name}!
          </h2>
          <p className="text-gray-600">
            Manage your courses, student projects, and track task submissions efficiently.
          </p>
        </div>

        {/* Lecturer Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Your Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Lecturer Name</label>
              <p className="text-lg text-gray-900 mt-1">{lecturer?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email Address</label>
              <p className="text-lg text-gray-900 mt-1">{lecturer?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Position</label>
              <p className="text-lg text-gray-900 mt-1">{getPositionLabel(lecturer?.position || '')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Gender</label>
              <p className="text-lg text-gray-900 mt-1 capitalize">{lecturer?.gender}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date of Birth</label>
              <p className="text-lg text-gray-900 mt-1">
                {lecturer?.dateOfBirth ? new Date(lecturer.dateOfBirth).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            className="rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition"
            style={{ borderTop: '4px solid #efa300' }}
          >
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: '#fff3cd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                📚
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">My Courses</h4>
                <p className="text-sm text-gray-600">Manage your courses</p>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition"
            style={{ borderTop: '4px solid #242d66' }}
          >
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: '#e8f0fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                👥
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Students</h4>
                <p className="text-sm text-gray-600">Manage student projects</p>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition"
            style={{ borderTop: '4px solid #6b7280' }}
          >
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                📊
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Reports</h4>
                <p className="text-sm text-gray-600">View class analytics</p>
              </div>
            </div>
          </div>
        </div>

        {/* Role-Based Section */}
        <div className="bg-gradient-to-r from-yellow-50 to-blue-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-2xl">👨‍🎓</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Your Role</h3>
              <p className="text-gray-700">
                As a <span className="font-semibold">{getPositionLabel(lecturer?.position || '')}</span>, you have full access to manage courses,
                assign projects, track student progress, and evaluate project submissions.
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">🚀 More Features Coming Soon</h3>
          <p className="text-blue-800">
            We're implementing advanced project management, grading systems, and analytics dashboards.
            Stay tuned for updates!
          </p>
        </div>
      </main>
    </div>
  );
}