'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Upload,
    FileText,
    Clock,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Star,
    GitBranch,
    Shield,
    TrendingUp,
    Calendar,
    Eye,
    Plus,
} from 'lucide-react';

export default function StudentSubmissionsDashboard() {
    const router = useRouter();

    // Hardcoded student data
    const studentData = {
        name: 'John Doe',
        studentId: 'IT22001',
        totalSubmissions: 12,
        pendingSubmissions: 3,
        gradedSubmissions: 8,
        averageScore: 85,
        integrityScore: 92,
    };

    // Hardcoded assignments
    const assignments = [
        {
            id: 1,
            title: 'Database Design Assignment',
            course: 'Database Management Systems',
            dueDate: '2025-01-10',
            status: 'pending',
            hasSubmission: false,
            maxScore: 100,
            description: 'Design a normalized database schema for an e-commerce system',
        },
        {
            id: 2,
            title: 'Software Engineering Essay',
            course: 'Software Engineering',
            dueDate: '2025-01-08',
            status: 'submitted',
            hasSubmission: true,
            submittedAt: '2025-01-03 14:30',
            versionCount: 3,
            plagiarismScore: 5,
            aiScore: 88,
            feedbackStatus: 'pending',
        },
        {
            id: 3,
            title: 'Python Programming Task',
            course: 'Programming Fundamentals',
            dueDate: '2025-01-05',
            status: 'graded',
            hasSubmission: true,
            submittedAt: '2025-01-02 09:15',
            versionCount: 5,
            plagiarismScore: 3,
            aiScore: 92,
            grade: 95,
            feedback: 'Excellent work! Your code is well-structured and efficient.',
            feedbackStatus: 'available',
        },
        {
            id: 4,
            title: 'Web Development Project',
            course: 'Web Technologies',
            dueDate: '2025-01-15',
            status: 'pending',
            hasSubmission: false,
            maxScore: 100,
            description: 'Create a responsive landing page using HTML, CSS, and JavaScript',
        },
        {
            id: 5,
            title: 'Data Structures Implementation',
            course: 'Data Structures & Algorithms',
            dueDate: '2025-01-03',
            status: 'overdue',
            hasSubmission: false,
            maxScore: 100,
            description: 'Implement a balanced BST with insertion and deletion operations',
        },
    ];

    const stats = [
        {
            label: 'Total Submissions',
            value: studentData.totalSubmissions,
            icon: <FileText size={24} />,
            color: 'blue',
            change: '+2',
        },
        {
            label: 'Pending Review',
            value: studentData.pendingSubmissions,
            icon: <Clock size={24} />,
            color: 'amber',
            change: '+1',
        },
        {
            label: 'Average Score',
            value: `${studentData.averageScore}%`,
            icon: <Star size={24} />,
            color: 'green',
            change: '+3%',
        },
        {
            label: 'Integrity Score',
            value: `${studentData.integrityScore}%`,
            icon: <Shield size={24} />,
            color: 'purple',
            change: '+2%',
        },
    ];

    const getStatColor = (color: string) => {
        const colors: { [key: string]: string } = {
            blue: 'bg-blue-50 border-blue-200',
            amber: 'bg-amber-50 border-amber-200',
            green: 'bg-green-50 border-green-200',
            purple: 'bg-purple-50 border-purple-200',
        };
        return colors[color] || 'bg-gray-50 border-gray-200';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock size={14} />
            Not Submitted
          </span>
                );
            case 'submitted':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock size={14} />
            Under Review
          </span>
                );
            case 'graded':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 size={14} />
            Graded
          </span>
                );
            case 'overdue':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle size={14} />
            Overdue
          </span>
                );
            default:
                return null;
        }
    };

    const getDaysUntilDue = (dueDate: string) => {
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
        if (diffDays === 0) return 'Due today';
        if (diffDays === 1) return 'Due tomorrow';
        return `${diffDays} days left`;
    };

    return (
        <div>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    Submission Center
                </h1>
                <p className="text-gray-600">
                    {studentData.studentId} • {studentData.name}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className={`${getStatColor(stat.color)} p-6 rounded-lg border shadow-sm`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-600 font-medium">{stat.label}</h3>
                            <div className="text-gray-400">{stat.icon}</div>
                        </div>
                        <div className="flex items-end justify-between">
                            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                            <span className={`text-sm font-medium ${
                                stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                            }`}>
                {stat.change}
              </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-6 mb-8 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Ready to submit?</h2>
                        <p className="text-purple-100">
                            Upload your work and get instant AI feedback with plagiarism detection
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/submissions/student/submit')}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
                    >
                        <Upload size={20} />
                        New Submission
                    </button>
                </div>
            </div>

            {/* Assignments List */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Active Assignments</h2>
                </div>

                <div className="divide-y divide-gray-200">
                    {assignments.map((assignment) => (
                        <div key={assignment.id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                            assignment.status === 'graded' ? 'bg-green-100' :
                                                assignment.status === 'submitted' ? 'bg-amber-100' :
                                                    assignment.status === 'overdue' ? 'bg-red-100' :
                                                        'bg-blue-100'
                                        }`}>
                                            <FileText size={24} className={
                                                assignment.status === 'graded' ? 'text-green-600' :
                                                    assignment.status === 'submitted' ? 'text-amber-600' :
                                                        assignment.status === 'overdue' ? 'text-red-600' :
                                                            'text-blue-600'
                                            } />
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                {assignment.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-2">{assignment.course}</p>

                                            {assignment.description && (
                                                <p className="text-sm text-gray-500 mb-3">{assignment.description}</p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <Calendar size={16} />
                                                    Due: {assignment.dueDate}
                                                </div>
                                                <div className={`font-medium ${
                                                    assignment.status === 'overdue' ? 'text-red-600' :
                                                        getDaysUntilDue(assignment.dueDate).includes('tomorrow') ||
                                                        getDaysUntilDue(assignment.dueDate).includes('today') ? 'text-amber-600' :
                                                            'text-gray-600'
                                                }`}>
                                                    {getDaysUntilDue(assignment.dueDate)}
                                                </div>

                                                {assignment.hasSubmission && (
                                                    <>
                                                        <div className="flex items-center gap-1 text-gray-600">
                                                            <GitBranch size={16} />
                                                            {assignment.versionCount} versions
                                                        </div>
                                                        {assignment.plagiarismScore !== undefined && (
                                                            <div className={`flex items-center gap-1 ${
                                                                assignment.plagiarismScore < 20 ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                                <Shield size={16} />
                                                                {assignment.plagiarismScore}% plagiarism
                                                            </div>
                                                        )}
                                                        {assignment.aiScore !== undefined && (
                                                            <div className="flex items-center gap-1 text-purple-600">
                                                                <Star size={16} />
                                                                AI Score: {assignment.aiScore}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {assignment.grade !== undefined && (
                                                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-gray-700">Final Grade:</span>
                                                        <span className="text-2xl font-bold text-green-600">{assignment.grade}%</span>
                                                    </div>
                                                    {assignment.feedback && (
                                                        <p className="text-sm text-gray-600 mt-2">{assignment.feedback}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3 ml-4">
                                    {getStatusBadge(assignment.status)}

                                    <div className="flex gap-2">
                                        {assignment.hasSubmission ? (
                                            <>
                                                <button
                                                    onClick={() => router.push(`/submissions/student/version-history/${assignment.id}`)}
                                                    className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <GitBranch size={16} />
                                                    Versions
                                                </button>
                                                {assignment.feedbackStatus === 'available' && (
                                                    <button
                                                        onClick={() => router.push(`/submissions/student/feedback/${assignment.id}`)}
                                                        className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                                    >
                                                        <Eye size={16} />
                                                        View Feedback
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => router.push('/submissions/student/submit')}
                                                    className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                    <Upload size={16} />
                                                    Resubmit
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => router.push('/submissions/student/submit')}
                                                className="flex items-center gap-1 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                                            >
                                                <Upload size={16} />
                                                Submit Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tips Section */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <GitBranch className="text-white" size={20} />
                        </div>
                        <h3 className="font-bold text-gray-900">Version Control</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                        Every submission is automatically versioned. You can view and compare previous versions anytime.
                    </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                            <Star className="text-white" size={20} />
                        </div>
                        <h3 className="font-bold text-gray-900">AI Feedback</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                        Get instant AI-powered feedback on your submissions to improve before final grading.
                    </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                            <Shield className="text-white" size={20} />
                        </div>
                        <h3 className="font-bold text-gray-900">Plagiarism Check</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                        All submissions are automatically checked for plagiarism against internet sources and peer submissions.
                    </p>
                </div>
            </div>
        </div>
    );
}