'use client';

import StudentRegistrationForm from '@/components/CommonForAll/auth/StudentRegistrationForm';

type TabType = 'student' | 'lecturer';

export default function RegisterPage() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #efa300 0%, #242d66 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '28px',
                fontWeight: 'bold',
              }}
            >
              PT
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Your Account</h1>
          <p className="mt-2 text-gray-600">Join our learning management system</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden p-6">
          <StudentRegistrationForm />
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>This registration is only for smartlms members. Please use your official credentials.</p>
        </div>
      </div>
    </div>
  );
}