'use client';

import React from 'react';
import {useRouter} from 'next/navigation';
import {
    AlertTriangle,
    Award,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    Eye,
    FileText,
    Shield,
    TrendingUp,
    Users,
} from 'lucide-react';

export default function LecturerDashboardPage() {
    const router = useRouter();

    // Hardcoded data
    const stats = {
        totalAssignments: 12,
        activeAssignments: 4,
        pendingReview: 23,
        gradedToday: 8,
        flaggedPlagiarism: 8,
        averageGrade: 82,
        submissionRate: 89,
        totalStudents: 156,
    };

    const pendingSubmissions = [
        {
            id: '1',
            student: 'Alice Johnson',
            studentId: 'STU001',
            assignment: 'Database Design and Normalization',
            module: 'CS3001',
            submittedAt: '2025-01-08 14:30',
            version: 3,
            wordCount: 1850,
            plagiarismScore: 7,
            aiScore: 88,
            urgent: false,
        },
        {
            id: '2',
            student: 'Bob Smith',
            studentId: 'STU002',
            assignment: 'Database Design and Normalization',
            module: 'CS3001',
            submittedAt: '2025-01-08 16:45',
            version: 5,
            wordCount: 2100,
            plagiarismScore: 25,
            aiScore: 75,
            urgent: true,
        },
        {
            id: '3',
            student: 'Carol White',
            studentId: 'STU003',
            assignment: 'Data Structures Implementation',
            module: 'CS2002',
            submittedAt: '2025-01-08 18:20',
            version: 4,
            wordCount: 1950,
            plagiarismScore: 6,
            aiScore: 92,
            urgent: false,
        },
    ];

    const recentActivity = [
        {
            id: '1',
            type: 'submission',
            student: 'David Brown',
            action: 'submitted',
            assignment: 'Web Technologies Project',
            time: '5 minutes ago',
            icon: FileText,
            color: 'blue',
        },
        {
            id: '2',
            type: 'plagiarism',
            student: 'Emma Davis',
            action: 'flagged for plagiarism (28%)',
            assignment: 'Software Engineering Essay',
            time: '15 minutes ago',
            icon: Shield,
            color: 'red',
        },
        {
            id: '3',
            type: 'grade',
            student: 'Frank Miller',
            action: 'graded',
            assignment: 'Python Programming',
            time: '1 hour ago',
            icon: Award,
            color: 'green',
        },
        {
            id: '4',
            type: 'submission',
            student: 'Grace Wilson',
            action: 'submitted Version 6',
            assignment: 'Database Design',
            time: '2 hours ago',
            icon: FileText,
            color: 'blue',
        },
    ];

    const upcomingDeadlines = [
        {
            id: '1',
            assignment: 'Database Design and Normalization',
            module: 'CS3001',
            dueDate: '2025-01-15 23:59',
            submissions: 45,
            totalStudents: 52,
            pending: 7,
        },
        {
            id: '2',
            assignment: 'Web Technologies Final Exam',
            module: 'WT3001',
            dueDate: '2025-01-20 14:00',
            submissions: 38,
            totalStudents: 48,
            pending: 10,
        },
    ];

    const flaggedStudents = [
        {
            id: '1',
            name: 'Bob Smith',
            studentId: 'STU002',
            assignment: 'Database Design',
            plagiarismScore: 25,
            reason: 'High similarity to online sources',
        },
        {
            id: '2',
            name: 'Emma Davis',
            studentId: 'STU004',
            assignment: 'Software Engineering Essay',
            plagiarismScore: 28,
            reason: 'Matched student paper from previous year',
        },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Lecturer Dashboard</h1>
                <p className="text-gray-600">Overview of your assignments and student
                    submissions</p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div
                    className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Pending Review</p>
                            <p className="text-4xl font-bold mt-1">{stats.pendingReview}</p>
                        </div>
                        <div
                            className="w-14 h-14 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Clock size={28}/>
                        </div>
                    </div>
                    <div className="flex items-center text-blue-100 text-sm">
                        <AlertTriangle size={16} className="mr-1"/>
                        Requires attention
                    </div>
                </div>

                <div
                    className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Graded Today</p>
                            <p className="text-4xl font-bold mt-1">{stats.gradedToday}</p>
                        </div>
                        <div
                            className="w-14 h-14 bg-green-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={28}/>
                        </div>
                    </div>
                    <div className="flex items-center text-green-100 text-sm">
                        <Award size={16} className="mr-1"/>
                        Great progress!
                    </div>
                </div>

                <div
                    className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-red-100 text-sm font-medium">Plagiarism Flags</p>
                            <p className="text-4xl font-bold mt-1">{stats.flaggedPlagiarism}</p>
                        </div>
                        <div
                            className="w-14 h-14 bg-red-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Shield size={28}/>
                        </div>
                    </div>
                    <div className="flex items-center text-red-100 text-sm">
                        <AlertTriangle size={16} className="mr-1"/>
                        Needs review
                    </div>
                </div>

                <div
                    className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">Class Average</p>
                            <p className="text-4xl font-bold mt-1">{stats.averageGrade}%</p>
                        </div>
                        <div
                            className="w-14 h-14 bg-purple-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <TrendingUp size={28}/>
                        </div>
                    </div>
                    <div className="flex items-center text-purple-100 text-sm">
                        <BarChart3 size={16} className="mr-1"/>
                        {stats.totalStudents} students
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Pending Submissions */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Pending Submissions */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Clock className="text-blue-600" size={24}/>
                                    Pending Review ({stats.pendingReview})
                                </h2>
                                <button
                                    onClick={() => router.push('/submissions/lecturer/submissions')}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                >
                                    View All →
                                </button>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {pendingSubmissions.map((submission) => (
                                <div key={submission.id}
                                     className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-gray-900">{submission.student}</h3>
                                                <span
                                                    className="text-sm text-gray-500">({submission.studentId})</span>
                                                {submission.urgent && (
                                                    <span
                                                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-1">
                            <AlertTriangle size={12}/>
                            High Plagiarism
                          </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-700 mb-2">{submission.assignment}</p>
                                            <div
                                                className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                                                <span>{submission.module}</span>
                                                <span>•</span>
                                                <span>Version {submission.version}</span>
                                                <span>•</span>
                                                <span>{new Date(submission.submittedAt).toLocaleDateString()} at {new Date(submission.submittedAt).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div
                                                    className="p-2 bg-gray-50 rounded border border-gray-200">
                                                    <div className="text-xs text-gray-600">Words
                                                    </div>
                                                    <div
                                                        className="text-sm font-bold text-gray-900">{submission.wordCount}</div>
                                                </div>
                                                <div className={`p-2 rounded border ${
                                                    submission.plagiarismScore < 10
                                                        ? 'bg-green-50 border-green-200'
                                                        : submission.plagiarismScore < 20
                                                            ? 'bg-amber-50 border-amber-200'
                                                            : 'bg-red-50 border-red-200'
                                                }`}>
                                                    <div
                                                        className="text-xs text-gray-600">Plagiarism
                                                    </div>
                                                    <div className={`text-sm font-bold ${
                                                        submission.plagiarismScore < 10
                                                            ? 'text-green-600'
                                                            : submission.plagiarismScore < 20
                                                                ? 'text-amber-600'
                                                                : 'text-red-600'
                                                    }`}>
                                                        {submission.plagiarismScore}%
                                                    </div>
                                                </div>
                                                <div
                                                    className="p-2 bg-purple-50 rounded border border-purple-200">
                                                    <div className="text-xs text-gray-600">AI
                                                        Score
                                                    </div>
                                                    <div
                                                        className="text-sm font-bold text-purple-600">{submission.aiScore}/100
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/submissions/lecturer/grading/${submission.id}`)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                                        >
                                            <Edit size={16}/>
                                            Grade
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming Deadlines */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="text-purple-600" size={24}/>
                                Upcoming Deadlines
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {upcomingDeadlines.map((deadline) => (
                                <div key={deadline.id}
                                     className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-2">{deadline.assignment}</h3>
                                            <div
                                                className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                                <span
                                                    className="font-medium">{deadline.module}</span>
                                                <span>•</span>
                                                <span>{new Date(deadline.dueDate).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <Users size={16} className="text-gray-400"/>
                                                    <span className="text-sm text-gray-700">
                            {deadline.submissions}/{deadline.totalStudents} submitted
                          </span>
                                                </div>
                                                <div className="flex-1 max-w-xs">
                                                    <div
                                                        className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-500 h-2 rounded-full"
                                                            style={{width: `${(deadline.submissions / deadline.totalStudents) * 100}%`}}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div
                                                className="text-2xl font-bold text-amber-600">{deadline.pending}</div>
                                            <div className="text-xs text-gray-600">pending</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Recent Activity */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="text-purple-600" size={20}/>
                                Recent Activity
                            </h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {recentActivity.map((item) => {
                                const IconComponent = item.icon;
                                const colorClasses = {
                                    blue: 'bg-blue-100 text-blue-600',
                                    red: 'bg-red-100 text-red-600',
                                    green: 'bg-green-100 text-green-600',
                                };
                                return (
                                    <div key={item.id} className="flex items-start gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                                            <IconComponent size={20}/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900">
                                                <span
                                                    className="font-medium">{item.student}</span> {item.action}
                                            </p>
                                            <p className="text-sm text-gray-600 truncate">{item.assignment}</p>
                                            <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Flagged for Plagiarism */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Shield className="text-red-600" size={20}/>
                                    Flagged Students
                                </h3>
                                <span
                                    className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  {flaggedStudents.length}
                </span>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {flaggedStudents.map((student) => (
                                <div key={student.id}
                                     className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{student.name}</p>
                                            <p className="text-xs text-gray-600">{student.studentId}</p>
                                        </div>
                                        <span
                                            className="text-lg font-bold text-red-600">{student.plagiarismScore}%</span>
                                    </div>
                                    <p className="text-xs text-gray-700 mb-2">{student.assignment}</p>
                                    <p className="text-xs text-red-600">{student.reason}</p>
                                    <button
                                        onClick={() => router.push(`/submissions/lecturer/plagiarism/${student.id}`)}
                                        className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                    >
                                        <Eye size={12}/>
                                        Review Report
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Quick Stats</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">Total Assignments</span>
                                <span
                                    className="text-sm font-bold text-gray-900">{stats.totalAssignments}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">Active Assignments</span>
                                <span
                                    className="text-sm font-bold text-blue-600">{stats.activeAssignments}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">Submission Rate</span>
                                <span
                                    className="text-sm font-bold text-green-600">{stats.submissionRate}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">Total Students</span>
                                <span
                                    className="text-sm font-bold text-purple-600">{stats.totalStudents}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
