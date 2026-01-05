'use client';

import React from 'react';
import {useRouter} from 'next/navigation';
import {
    AlertTriangle,
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    Eye,
    FileText,
    GitBranch,
    Shield,
    Star,
    Target,
    TrendingUp,
} from 'lucide-react';

export default function StudentDashboardPage() {
    const router = useRouter();

    // Hardcoded data
    const stats = {
        totalAssignments: 8,
        pending: 3,
        inProgress: 2,
        submitted: 2,
        graded: 1,
        overdue: 0,
        averageGrade: 87,
        plagiarismScore: 5, // Lower is better
        submissionRate: 92,
    };

    const upcomingDeadlines = [
        {
            id: '1',
            title: 'Database Design and Normalization',
            module: 'CS3001',
            dueDate: '2025-01-15 23:59',
            status: 'pending',
            marks: 100,
        },
        {
            id: '2',
            title: 'Software Development Lifecycle Quiz',
            module: 'SE2001',
            dueDate: '2025-01-10 18:00',
            status: 'in-progress',
            marks: 50,
            currentVersion: 2,
        },
        {
            id: '4',
            title: 'Web Technologies Final Exam',
            module: 'WT3001',
            dueDate: '2025-01-20 14:00',
            status: 'pending',
            marks: 100,
        },
    ];

    const recentSubmissions = [
        {
            id: '3',
            title: 'Data Structures Implementation',
            module: 'CS2002',
            submittedAt: '2025-01-07 22:45',
            version: 4,
            status: 'submitted',
            plagiarismScore: 8,
            aiScore: 88,
        },
        {
            id: '5',
            title: 'Python Programming Basics',
            module: 'CS1001',
            submittedAt: '2025-01-04 18:30',
            version: 5,
            status: 'graded',
            grade: 95,
            plagiarismScore: 3,
            aiScore: 92,
        },
    ];

    const recentFeedback = [
        {
            id: '1',
            assignment: 'Python Programming Basics',
            type: 'Grade Published',
            message: 'Your assignment has been graded. Grade: 95/100',
            time: '2 hours ago',
            icon: Award,
            color: 'green',
        },
        {
            id: '2',
            assignment: 'Data Structures Implementation',
            type: 'AI Feedback',
            message: 'New AI feedback available for Version 4',
            time: '5 hours ago',
            icon: Star,
            color: 'purple',
        },
        {
            id: '3',
            assignment: 'Database Design and Normalization',
            type: 'Reminder',
            message: 'Deadline approaching in 8 days',
            time: '1 day ago',
            icon: Clock,
            color: 'amber',
        },
    ];

    const getDaysRemaining = (dueDate: string) => {
        const due = new Date(dueDate);
        const now = new Date();
        const diff = due.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return {text: `${Math.abs(days)} days overdue`, color: 'text-red-600'};
        if (days === 0) return {text: 'Due today', color: 'text-red-600'};
        if (days === 1) return {text: 'Due tomorrow', color: 'text-amber-600'};
        if (days <= 3) return {text: `${days} days left`, color: 'text-amber-600'};
        return {text: `${days} days left`, color: 'text-gray-600'};
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
                <p className="text-gray-600">Welcome back! Here&#39;s your submission overview</p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div
                    className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Total Assignments</p>
                            <p className="text-4xl font-bold mt-1">{stats.totalAssignments}</p>
                        </div>
                        <div
                            className="w-14 h-14 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <FileText size={28}/>
                        </div>
                    </div>
                    <div className="flex items-center text-blue-100 text-sm">
                        <TrendingUp size={16} className="mr-1"/>
                        2 new this week
                    </div>
                </div>

                <div
                    className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-amber-100 text-sm font-medium">Pending</p>
                            <p className="text-4xl font-bold mt-1">{stats.pending}</p>
                        </div>
                        <div
                            className="w-14 h-14 bg-amber-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Clock size={28}/>
                        </div>
                    </div>
                    <div className="flex items-center text-amber-100 text-sm">
                        <AlertTriangle size={16} className="mr-1"/>
                        Action required
                    </div>
                </div>

                <div
                    className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Average Grade</p>
                            <p className="text-4xl font-bold mt-1">{stats.averageGrade}%</p>
                        </div>
                        <div
                            className="w-14 h-14 bg-green-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Award size={28}/>
                        </div>
                    </div>
                    <div className="flex items-center text-green-100 text-sm">
                        <TrendingUp size={16} className="mr-1"/>
                        +5% from last month
                    </div>
                </div>

                <div
                    className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">Submission Rate</p>
                            <p className="text-4xl font-bold mt-1">{stats.submissionRate}%</p>
                        </div>
                        <div
                            className="w-14 h-14 bg-purple-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Target size={28}/>
                        </div>
                    </div>
                    <div className="flex items-center text-purple-100 text-sm">
                        <CheckCircle2 size={16} className="mr-1"/>
                        Excellent!
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Upcoming Deadlines */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Upcoming Deadlines */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="text-purple-600" size={24}/>
                                Upcoming Deadlines
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {upcomingDeadlines.map((assignment) => {
                                const deadline = getDaysRemaining(assignment.dueDate);
                                return (
                                    <div key={assignment.id}
                                         className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                                                    {assignment.status === 'in-progress' && (
                                                        <span
                                                            className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                              In Progress
                            </span>
                                                    )}
                                                </div>
                                                <div
                                                    className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                                    <span
                                                        className="font-medium">{assignment.module}</span>
                                                    <span>•</span>
                                                    <span>{assignment.marks} marks</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar size={16} className="text-gray-400"/>
                                                    <span className="text-gray-600">
                            {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                          </span>
                                                    <span
                                                        className={`font-medium ${deadline.color}`}>
                            ({deadline.text})
                          </span>
                                                </div>
                                                {assignment.currentVersion && (
                                                    <div
                                                        className="flex items-center gap-2 text-sm text-purple-600 mt-2">
                                                        <GitBranch size={16}/>
                                                        <span>Current Version: {assignment.currentVersion}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {assignment.status === 'pending' && (
                                                    <button
                                                        onClick={() => router.push(`/submissions/student/submit/${assignment.id}`)}
                                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <Edit size={16}/>
                                                        Start
                                                    </button>
                                                )}
                                                {assignment.status === 'in-progress' && (
                                                    <button
                                                        onClick={() => router.push(`/submissions/student/submit/${assignment.id}`)}
                                                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <Edit size={16}/>
                                                        Continue
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                            <button
                                onClick={() => router.push('/submissions/student/assignments')}
                                className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2"
                            >
                                View All Assignments
                                <span>→</span>
                            </button>
                        </div>
                    </div>

                    {/* Recent Submissions */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="text-purple-600" size={24}/>
                                Recent Submissions
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {recentSubmissions.map((submission) => (
                                <div key={submission.id}
                                     className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-gray-900">{submission.title}</h3>
                                                {submission.status === 'graded' ? (
                                                    <span
                                                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                            <Award size={14}/>
                            Graded
                          </span>
                                                ) : (
                                                    <span
                                                        className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 size={14}/>
                            Submitted
                          </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-600 mb-3">
                                                <span
                                                    className="font-medium">{submission.module}</span>
                                                <span className="mx-2">•</span>
                                                <span>Submitted {new Date(submission.submittedAt).toLocaleDateString()}</span>
                                                <span className="mx-2">•</span>
                                                <span
                                                    className="text-purple-600 font-medium">Version {submission.version}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {submission.grade !== undefined && (
                                                    <div
                                                        className="p-2 bg-green-50 border border-green-200 rounded">
                                                        <div
                                                            className="text-xs text-gray-600">Grade
                                                        </div>
                                                        <div
                                                            className="text-lg font-bold text-green-600">{submission.grade}%
                                                        </div>
                                                    </div>
                                                )}
                                                <div className={`p-2 border rounded ${
                                                    submission.plagiarismScore < 10
                                                        ? 'bg-green-50 border-green-200'
                                                        : 'bg-amber-50 border-amber-200'
                                                }`}>
                                                    <div
                                                        className="text-xs text-gray-600">Plagiarism
                                                    </div>
                                                    <div className={`text-lg font-bold ${
                                                        submission.plagiarismScore < 10
                                                            ? 'text-green-600'
                                                            : 'text-amber-600'
                                                    }`}>
                                                        {submission.plagiarismScore}%
                                                    </div>
                                                </div>
                                                <div
                                                    className="p-2 bg-purple-50 border border-purple-200 rounded">
                                                    <div className="text-xs text-gray-600">AI
                                                        Score
                                                    </div>
                                                    <div
                                                        className="text-lg font-bold text-purple-600">{submission.aiScore}/100
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/submissions/student/my-submissions/${submission.id}`)}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
                                        >
                                            <Eye size={16}/>
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                            <button
                                onClick={() => router.push('/submissions/student/my-submissions')}
                                className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2"
                            >
                                View All Submissions
                                <span>→</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Recent Feedback & Quick Stats */}
                <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Shield className="text-purple-600" size={20}/>
                            Academic Integrity
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span
                                        className="text-sm text-gray-600">Avg. Plagiarism Score</span>
                                    <span
                                        className="text-lg font-bold text-green-600">{stats.plagiarismScore}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{width: `${Math.min(stats.plagiarismScore * 5, 100)}%`}}
                                    />
                                </div>
                                <p className="text-xs text-green-600 mt-1 font-medium">Excellent!
                                    Keep it up!</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Feedback */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Star className="text-purple-600" size={20}/>
                                Recent Activity
                            </h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {recentFeedback.map((item) => {
                                const IconComponent = item.icon;
                                const colorClasses = {
                                    green: 'bg-green-100 text-green-600',
                                    purple: 'bg-purple-100 text-purple-600',
                                    amber: 'bg-amber-100 text-amber-600',
                                };
                                return (
                                    <div key={item.id} className="flex items-start gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                                            <IconComponent size={20}/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 mb-1">{item.type}</p>
                                            <p className="text-sm text-gray-600 mb-1">{item.assignment}</p>
                                            <p className="text-xs text-gray-500">{item.time}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Status Overview */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Assignment Status</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"/>
                                    <span className="text-sm text-gray-700">Pending</span>
                                </div>
                                <span
                                    className="text-sm font-bold text-gray-900">{stats.pending}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-amber-500 rounded-full"/>
                                    <span className="text-sm text-gray-700">In Progress</span>
                                </div>
                                <span
                                    className="text-sm font-bold text-gray-900">{stats.inProgress}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full"/>
                                    <span className="text-sm text-gray-700">Submitted</span>
                                </div>
                                <span
                                    className="text-sm font-bold text-gray-900">{stats.submitted}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"/>
                                    <span className="text-sm text-gray-700">Graded</span>
                                </div>
                                <span
                                    className="text-sm font-bold text-gray-900">{stats.graded}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
