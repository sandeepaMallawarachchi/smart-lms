'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    User,
    Calendar,
    GitBranch,
    Shield,
    Star,
    Eye,
    Edit,
    Search,
    Filter,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Award,
    Download,
} from 'lucide-react';

interface Submission {
    id: string;
    student: {
        id: string;
        name: string;
        studentId: string;
    };
    assignment: {
        id: string;
        title: string;
        module: string;
        totalMarks: number;
    };
    submittedAt: string;
    version: number;
    wordCount: number;
    plagiarismScore: number;
    aiScore: number;
    status: 'pending' | 'graded' | 'flagged' | 'late';
    grade?: number;
    isLate: boolean;
    dueDate: string;
}

export default function LecturerAllSubmissionsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'graded' | 'flagged' | 'late'>('all');
    const [filterAssignment, setFilterAssignment] = useState('all');
    const [sortBy, setSortBy] = useState<'date' | 'student' | 'plagiarism' | 'ai'>('date');

    // Hardcoded submissions data
    const submissions: Submission[] = [
        {
            id: '1',
            student: {
                id: 's1',
                name: 'Alice Johnson',
                studentId: 'STU001',
            },
            assignment: {
                id: 'a1',
                title: 'Database Design and Normalization',
                module: 'CS3001',
                totalMarks: 100,
            },
            submittedAt: '2025-01-08 20:45',
            version: 4,
            wordCount: 850,
            plagiarismScore: 5,
            aiScore: 88,
            status: 'pending',
            isLate: false,
            dueDate: '2025-01-15 23:59',
        },
        {
            id: '2',
            student: {
                id: 's2',
                name: 'Bob Smith',
                studentId: 'STU002',
            },
            assignment: {
                id: 'a2',
                title: 'Software Development Lifecycle Quiz',
                module: 'SE2001',
                totalMarks: 50,
            },
            submittedAt: '2025-01-08 16:30',
            version: 2,
            wordCount: 620,
            plagiarismScore: 12,
            aiScore: 75,
            status: 'pending',
            isLate: false,
            dueDate: '2025-01-10 18:00',
        },
        {
            id: '3',
            student: {
                id: 's3',
                name: 'Carol Williams',
                studentId: 'STU003',
            },
            assignment: {
                id: 'a3',
                title: 'Data Structures Implementation',
                module: 'CS2002',
                totalMarks: 100,
            },
            submittedAt: '2025-01-08 22:15',
            version: 5,
            wordCount: 920,
            plagiarismScore: 3,
            aiScore: 92,
            status: 'graded',
            grade: 95,
            isLate: false,
            dueDate: '2025-01-08 23:59',
        },
        {
            id: '4',
            student: {
                id: 's4',
                name: 'David Brown',
                studentId: 'STU004',
            },
            assignment: {
                id: 'a1',
                title: 'Database Design and Normalization',
                module: 'CS3001',
                totalMarks: 100,
            },
            submittedAt: '2025-01-08 19:20',
            version: 3,
            wordCount: 720,
            plagiarismScore: 28,
            aiScore: 68,
            status: 'flagged',
            isLate: false,
            dueDate: '2025-01-15 23:59',
        },
        {
            id: '5',
            student: {
                id: 's5',
                name: 'Emma Davis',
                studentId: 'STU005',
            },
            assignment: {
                id: 'a4',
                title: 'Python Programming Basics',
                module: 'CS1001',
                totalMarks: 100,
            },
            submittedAt: '2025-01-06 02:30',
            version: 6,
            wordCount: 980,
            plagiarismScore: 7,
            aiScore: 90,
            status: 'late',
            isLate: true,
            dueDate: '2025-01-05 23:59',
        },
        {
            id: '6',
            student: {
                id: 's6',
                name: 'Frank Martinez',
                studentId: 'STU006',
            },
            assignment: {
                id: 'a2',
                title: 'Software Development Lifecycle Quiz',
                module: 'SE2001',
                totalMarks: 50,
            },
            submittedAt: '2025-01-08 15:45',
            version: 1,
            wordCount: 450,
            plagiarismScore: 35,
            aiScore: 62,
            status: 'flagged',
            isLate: false,
            dueDate: '2025-01-10 18:00',
        },
    ];

    const filteredSubmissions = submissions.filter(submission => {
        const matchesSearch = submission.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            submission.student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            submission.assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;
        const matchesAssignment = filterAssignment === 'all' || submission.assignment.id === filterAssignment;
        return matchesSearch && matchesStatus && matchesAssignment;
    });

    const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
        switch (sortBy) {
            case 'date':
                return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
            case 'student':
                return a.student.name.localeCompare(b.student.name);
            case 'plagiarism':
                return b.plagiarismScore - a.plagiarismScore;
            case 'ai':
                return b.aiScore - a.aiScore;
            default:
                return 0;
        }
    });

    const stats = {
        total: submissions.length,
        pending: submissions.filter(s => s.status === 'pending').length,
        graded: submissions.filter(s => s.status === 'graded').length,
        flagged: submissions.filter(s => s.status === 'flagged').length,
        late: submissions.filter(s => s.status === 'late').length,
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock size={14} />
            Pending Review
          </span>
                );
            case 'graded':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 size={14} />
            Graded
          </span>
                );
            case 'flagged':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle size={14} />
            Flagged
          </span>
                );
            case 'late':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            <AlertTriangle size={14} />
            Late Submission
          </span>
                );
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">All Submissions</h1>
                <p className="text-gray-600">Review and grade student submissions</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-xs text-gray-600 mt-1">Total</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
                    <div className="text-xs text-amber-600 mt-1">Pending</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{stats.graded}</div>
                    <div className="text-xs text-green-600 mt-1">Graded</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-700">{stats.flagged}</div>
                    <div className="text-xs text-red-600 mt-1">Flagged</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-700">{stats.late}</div>
                    <div className="text-xs text-purple-600 mt-1">Late</div>
                </div>
            </div>

            {/* Filters and Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col gap-4">
                    {/* Search and Sort */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by student name, ID, or assignment..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 whitespace-nowrap">Sort by:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as never)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="date">Date</option>
                                <option value="student">Student</option>
                                <option value="plagiarism">Plagiarism</option>
                                <option value="ai">AI Score</option>
                            </select>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Filter size={20} className="text-gray-400" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as never)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="graded">Graded</option>
                                <option value="flagged">Flagged</option>
                                <option value="late">Late</option>
                            </select>
                        </div>

                        <select
                            value={filterAssignment}
                            onChange={(e) => setFilterAssignment(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Assignments</option>
                            <option value="a1">Database Design</option>
                            <option value="a2">SDLC Quiz</option>
                            <option value="a3">Data Structures</option>
                            <option value="a4">Python Basics</option>
                        </select>

                        <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2">
                            <Download size={18} />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Submissions List */}
            <div className="space-y-4">
                {sortedSubmissions.map((submission) => (
                    <div
                        key={submission.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between">
                            {/* Left Section */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <User className="text-blue-600" size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900">{submission.student.name}</h3>
                                            <span className="text-xs text-gray-500">{submission.student.studentId}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{submission.assignment.title}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="text-gray-400" size={16} />
                                        <span className="text-gray-700">
                      {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                      })}
                    </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <GitBranch className="text-purple-600" size={16} />
                                        <span className="text-gray-700">Version {submission.version}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileText className="text-blue-600" size={16} />
                                        <span className="text-gray-700">{submission.wordCount} words</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Award className="text-amber-600" size={16} />
                                        <span className="text-gray-700">{submission.assignment.totalMarks} marks</span>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Star className="text-purple-600" size={16} />
                                            <span className="text-xs text-gray-600">AI Score</span>
                                        </div>
                                        <div className="text-lg font-bold text-purple-600">{submission.aiScore}/100</div>
                                    </div>
                                    <div className={`p-3 rounded-lg border ${
                                        submission.plagiarismScore < 20
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-red-50 border-red-200'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Shield className={submission.plagiarismScore < 20 ? 'text-green-600' : 'text-red-600'} size={16} />
                                            <span className="text-xs text-gray-600">Plagiarism</span>
                                        </div>
                                        <div className={`text-lg font-bold ${
                                            submission.plagiarismScore < 20 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {submission.plagiarismScore}%
                                        </div>
                                    </div>
                                    {submission.grade !== undefined ? (
                                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Award className="text-green-600" size={16} />
                                                <span className="text-xs text-gray-600">Grade</span>
                                            </div>
                                            <div className="text-lg font-bold text-green-600">{submission.grade}%</div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Award className="text-gray-400" size={16} />
                                                <span className="text-xs text-gray-600">Grade</span>
                                            </div>
                                            <div className="text-sm font-medium text-gray-500">Not graded</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Section - Status and Actions */}
                            <div className="flex flex-col items-end gap-3 ml-4">
                                {getStatusBadge(submission.status)}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => router.push(`/submissions/lecturer/submissions/${submission.id}`)}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                                    >
                                        <Eye size={16} />
                                        View
                                    </button>
                                    {submission.status !== 'graded' && (
                                        <button
                                            onClick={() => router.push(`/submissions/lecturer/grading/${submission.id}`)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm"
                                        >
                                            <Edit size={16} />
                                            Grade
                                        </button>
                                    )}
                                </div>

                                {submission.isLate && (
                                    <div className="text-xs text-purple-600 font-medium">
                                        Late by {Math.ceil((new Date(submission.submittedAt).getTime() - new Date(submission.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days
                                    </div>
                                )}

                                {submission.plagiarismScore >= 20 && (
                                    <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                        <AlertTriangle size={14} />
                                        High plagiarism
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {sortedSubmissions.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No submissions found</p>
                        <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>
        </div>
    );
}
