'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Eye,
    FileText,
    GitBranch,
    Shield,
    Star,
} from 'lucide-react';

interface Submission {
    id: string;
    assignmentTitle: string;
    module: {
        code: string;
        name: string;
    };
    submittedAt: string;
    totalVersions: number;
    latestVersion: number;
    status: 'submitted' | 'graded' | 'pending-review';
    grade?: number;
    totalMarks: number;
    plagiarismScore: number;
    aiScore: number;
    wordCount: number;
    feedback?: {
        lecturer?: string;
        ai?: string;
    };
}

export default function MySubmissionsPage() {
    const router = useRouter();
    const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'graded'>('all');

    // Hardcoded submissions data
    const submissions: Submission[] = [
        {
            id: '1',
            assignmentTitle: 'Python Programming Basics',
            module: {code: 'CS1001', name: 'Programming Fundamentals'},
            submittedAt: '2025-01-04 18:30',
            totalVersions: 5,
            latestVersion: 5,
            status: 'graded',
            grade: 95,
            totalMarks: 100,
            plagiarismScore: 3,
            aiScore: 92,
            wordCount: 1250,
            feedback: {
                lecturer: 'Excellent work! Your code is well-structured and demonstrates strong understanding of Python fundamentals.',
                ai: 'Great implementation of functions and data structures. Consider adding more comments for complex logic.',
            },
        },
        {
            id: '2',
            assignmentTitle: 'Data Structures Implementation',
            module: {code: 'CS2002', name: 'Data Structures & Algorithms'},
            submittedAt: '2025-01-07 22:45',
            totalVersions: 4,
            latestVersion: 4,
            status: 'submitted',
            totalMarks: 100,
            plagiarismScore: 8,
            aiScore: 88,
            wordCount: 2100,
            feedback: {
                ai: 'Good implementation of tree structures. Your AVL tree balancing logic is correct and efficient.',
            },
        },
        {
            id: '3',
            assignmentTitle: 'Software Development Lifecycle Quiz',
            module: {code: 'SE2001', name: 'Software Engineering'},
            submittedAt: '2025-01-08 17:15',
            totalVersions: 2,
            latestVersion: 2,
            status: 'pending-review',
            totalMarks: 50,
            plagiarismScore: 5,
            aiScore: 85,
            wordCount: 850,
            feedback: {
                ai: 'Solid understanding of Agile methodologies. Consider providing more specific examples in your answers.',
            },
        },
        {
            id: '4',
            assignmentTitle: 'Web Development Project',
            module: {code: 'WT2001', name: 'Web Technologies'},
            submittedAt: '2024-12-20 23:59',
            totalVersions: 8,
            latestVersion: 8,
            status: 'graded',
            grade: 88,
            totalMarks: 100,
            plagiarismScore: 6,
            aiScore: 90,
            wordCount: 1800,
            feedback: {
                lecturer: 'Good project overall. Your React components are well-organized. The UI could be more polished.',
                ai: 'Excellent use of modern React patterns. Your state management is efficient and clean.',
            },
        },
        {
            id: '5',
            assignmentTitle: 'Object-Oriented Design Patterns',
            module: {code: 'CS3003', name: 'Advanced Programming'},
            submittedAt: '2024-12-15 20:30',
            totalVersions: 6,
            latestVersion: 6,
            status: 'graded',
            grade: 82,
            totalMarks: 100,
            plagiarismScore: 12,
            aiScore: 78,
            wordCount: 1600,
            feedback: {
                lecturer: 'You understand the patterns but implementation could be improved. Review the Factory pattern examples.',
                ai: 'Good attempt at implementing design patterns. Some implementations deviate from standard patterns.',
            },
        },
    ];

    const filteredSubmissions = submissions.filter(sub => {
        if (filterStatus === 'all') return true;
        return sub.status === filterStatus;
    });

    const stats = {
        total: submissions.length,
        graded: submissions.filter(s => s.status === 'graded').length,
        submitted: submissions.filter(s => s.status === 'submitted').length,
        pendingReview: submissions.filter(s => s.status === 'pending-review').length,
        averageGrade: Math.round(
            submissions.filter(s => s.grade).reduce((sum, s) => sum + (s.grade || 0), 0) /
            submissions.filter(s => s.grade).length
        ),
        totalVersions: submissions.reduce((sum, s) => sum + s.totalVersions, 0),
    };

    const getStatusBadge = (status: string, grade?: number) => {
        switch (status) {
            case 'graded':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <Award size={14}/>
            Graded {grade && `(${grade}%)`}
          </span>
                );
            case 'submitted':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            <CheckCircle2 size={14}/>
            Submitted
          </span>
                );
            case 'pending-review':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock size={14}/>
            Pending Review
          </span>
                );
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">My Submissions</h1>
                <p className="text-gray-600">View all your submitted assignments and their
                    feedback</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-xs text-gray-600 mt-1">Total Submissions</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{stats.graded}</div>
                    <div className="text-xs text-green-600 mt-1">Graded</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-700">{stats.submitted}</div>
                    <div className="text-xs text-purple-600 mt-1">Submitted</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">{stats.pendingReview}</div>
                    <div className="text-xs text-amber-600 mt-1">Pending Review</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{stats.averageGrade}%</div>
                    <div className="text-xs text-blue-600 mt-1">Average Grade</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <div className="text-2xl font-bold text-indigo-700">{stats.totalVersions}</div>
                    <div className="text-xs text-indigo-600 mt-1">Total Versions</div>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">Filter by status:</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filterStatus === 'all'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            All ({submissions.length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('graded')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filterStatus === 'graded'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Graded ({stats.graded})
                        </button>
                        <button
                            onClick={() => setFilterStatus('submitted')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filterStatus === 'submitted'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Submitted ({stats.submitted})
                        </button>
                    </div>
                </div>
            </div>

            {/* Submissions List */}
            <div className="space-y-4">
                {filteredSubmissions.map((submission) => (
                    <div
                        key={submission.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                        <div
                            className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            {/* Left Section */}
                            <div className="flex-1">
                                <div className="flex items-start gap-4 mb-4">
                                    <div
                                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                            submission.status === 'graded' ? 'bg-green-100' :
                                                submission.status === 'submitted' ? 'bg-purple-100' :
                                                    'bg-amber-100'
                                        }`}>
                                        <FileText size={24} className={
                                            submission.status === 'graded' ? 'text-green-600' :
                                                submission.status === 'submitted' ? 'text-purple-600' :
                                                    'text-amber-600'
                                        }/>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">{submission.assignmentTitle}</h3>
                                            {getStatusBadge(submission.status, submission.grade)}
                                        </div>

                                        <div
                                            className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                            <span
                                                className="font-medium">{submission.module.code}</span>
                                            <span>•</span>
                                            <span>{submission.module.name}</span>
                                        </div>

                                        <div
                                            className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={16}/>
                                                <span>Submitted {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}</span>
                                            </div>
                                            <div
                                                className="flex items-center gap-1 text-purple-600 font-medium">
                                                <GitBranch size={16}/>
                                                <span>{submission.totalVersions} version(s) • Latest: v{submission.latestVersion}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    {submission.grade !== undefined && (
                                        <div
                                            className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <div
                                                className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                                <Award size={14}/>
                                                Grade
                                            </div>
                                            <div
                                                className="text-xl font-bold text-green-600">{submission.grade}%
                                            </div>
                                            <div
                                                className="text-xs text-gray-500">{submission.totalMarks} marks
                                            </div>
                                        </div>
                                    )}
                                    <div className={`p-3 border rounded-lg ${
                                        submission.plagiarismScore < 10
                                            ? 'bg-green-50 border-green-200'
                                            : submission.plagiarismScore < 20
                                                ? 'bg-amber-50 border-amber-200'
                                                : 'bg-red-50 border-red-200'
                                    }`}>
                                        <div
                                            className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                            <Shield size={14}/>
                                            Plagiarism
                                        </div>
                                        <div className={`text-xl font-bold ${
                                            submission.plagiarismScore < 10
                                                ? 'text-green-600'
                                                : submission.plagiarismScore < 20
                                                    ? 'text-amber-600'
                                                    : 'text-red-600'
                                        }`}>
                                            {submission.plagiarismScore}%
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {submission.plagiarismScore < 10 ? 'Excellent' : submission.plagiarismScore < 20 ? 'Good' : 'High'}
                                        </div>
                                    </div>
                                    <div
                                        className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                        <div
                                            className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                            <Star size={14}/>
                                            AI Score
                                        </div>
                                        <div
                                            className="text-xl font-bold text-purple-600">{submission.aiScore}/100
                                        </div>
                                        <div className="text-xs text-gray-500">Quality</div>
                                    </div>
                                    <div
                                        className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div
                                            className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                            <FileText size={14}/>
                                            Words
                                        </div>
                                        <div
                                            className="text-xl font-bold text-blue-600">{submission.wordCount}</div>
                                        <div className="text-xs text-gray-500">Total</div>
                                    </div>
                                </div>

                                {/* Feedback Section */}
                                {submission.feedback && (
                                    <div className="space-y-2">
                                        {submission.feedback.lecturer && (
                                            <div
                                                className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                                                <div className="flex items-start gap-2">
                                                    <Award className="text-blue-600 mt-0.5"
                                                           size={18}/>
                                                    <div>
                                                        <p className="text-xs font-medium text-blue-900 mb-1">Lecturer
                                                            Feedback:</p>
                                                        <p className="text-sm text-blue-800">{submission.feedback.lecturer}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {submission.feedback.ai && (
                                            <div
                                                className="p-3 bg-purple-50 border-l-4 border-purple-500 rounded">
                                                <div className="flex items-start gap-2">
                                                    <Star className="text-purple-600 mt-0.5"
                                                          size={18}/>
                                                    <div>
                                                        <p className="text-xs font-medium text-purple-900 mb-1">AI
                                                            Feedback:</p>
                                                        <p className="text-sm text-purple-800">{submission.feedback.ai}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Right Section - Actions */}
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => router.push(`/submissions/student/my-submissions/${submission.id}`)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2 justify-center"
                                >
                                    <Eye size={18}/>
                                    View Details
                                </button>
                                <button
                                    onClick={() => router.push(`/submissions/student/versions/${submission.id}`)}
                                    className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium flex items-center gap-2 justify-center"
                                >
                                    <GitBranch size={18}/>
                                    Version History
                                </button>
                                <button
                                    onClick={() => router.push(`/submissions/student/plagiarism/${submission.id}`)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2 justify-center"
                                >
                                    <Shield size={18}/>
                                    Plagiarism Report
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredSubmissions.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <FileText size={48} className="mx-auto text-gray-400 mb-4"/>
                        <p className="text-gray-500 text-lg">No submissions found</p>
                        <p className="text-gray-400 text-sm mt-2">Try adjusting your filter</p>
                    </div>
                )}
            </div>
        </div>
    );
}
