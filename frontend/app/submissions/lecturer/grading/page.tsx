'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Edit,
    User,
    FileText,
    Calendar,
    GitBranch,
    Shield,
    Star,
    Clock,
    AlertTriangle,
    Award,
    Search,
    Filter,
    CheckCircle2,
    TrendingUp,
    Eye,
} from 'lucide-react';

interface GradingItem {
    id: string;
    student: {
        id: string;
        name: string;
        studentId: string;
        avatar?: string;
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
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
    isLate: boolean;
    daysOverdue?: number;
}

export default function LecturerGradingQueuePage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [filterAssignment, setFilterAssignment] = useState('all');
    const [sortBy, setSortBy] = useState<'date' | 'priority' | 'plagiarism' | 'ai'>('priority');

    // Hardcoded grading queue data
    const gradingQueue: GradingItem[] = [
        {
            id: 's1',
            student: {
                id: 'stu1',
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
            priority: 'medium',
            dueDate: '2025-01-15 23:59',
            isLate: false,
        },
        {
            id: 's2',
            student: {
                id: 'stu2',
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
            priority: 'medium',
            dueDate: '2025-01-10 18:00',
            isLate: false,
        },
        {
            id: 's3',
            student: {
                id: 'stu3',
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
            priority: 'high',
            dueDate: '2025-01-15 23:59',
            isLate: false,
        },
        {
            id: 's4',
            student: {
                id: 'stu4',
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
            priority: 'high',
            dueDate: '2025-01-05 23:59',
            isLate: true,
            daysOverdue: 1,
        },
        {
            id: 's5',
            student: {
                id: 'stu5',
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
            priority: 'high',
            dueDate: '2025-01-10 18:00',
            isLate: false,
        },
        {
            id: 's6',
            student: {
                id: 'stu6',
                name: 'Grace Lee',
                studentId: 'STU007',
            },
            assignment: {
                id: 'a3',
                title: 'Data Structures Implementation',
                module: 'CS2002',
                totalMarks: 100,
            },
            submittedAt: '2025-01-08 14:20',
            version: 5,
            wordCount: 890,
            plagiarismScore: 4,
            aiScore: 92,
            priority: 'low',
            dueDate: '2025-01-08 23:59',
            isLate: false,
        },
        {
            id: 's7',
            student: {
                id: 'stu7',
                name: 'Henry Wilson',
                studentId: 'STU008',
            },
            assignment: {
                id: 'a1',
                title: 'Database Design and Normalization',
                module: 'CS3001',
                totalMarks: 100,
            },
            submittedAt: '2025-01-08 21:15',
            version: 2,
            wordCount: 680,
            plagiarismScore: 9,
            aiScore: 78,
            priority: 'medium',
            dueDate: '2025-01-15 23:59',
            isLate: false,
        },
    ];

    const filteredQueue = gradingQueue.filter(item => {
        const matchesSearch = item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
        const matchesAssignment = filterAssignment === 'all' || item.assignment.id === filterAssignment;
        return matchesSearch && matchesPriority && matchesAssignment;
    });

    const sortedQueue = [...filteredQueue].sort((a, b) => {
        switch (sortBy) {
            case 'priority':
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            case 'date':
                return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
            case 'plagiarism':
                return b.plagiarismScore - a.plagiarismScore;
            case 'ai':
                return a.aiScore - b.aiScore;
            default:
                return 0;
        }
    });

    const stats = {
        total: gradingQueue.length,
        high: gradingQueue.filter(i => i.priority === 'high').length,
        medium: gradingQueue.filter(i => i.priority === 'medium').length,
        low: gradingQueue.filter(i => i.priority === 'low').length,
        late: gradingQueue.filter(i => i.isLate).length,
        flagged: gradingQueue.filter(i => i.plagiarismScore >= 20).length,
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'high':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle size={14} />
            High Priority
          </span>
                );
            case 'medium':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock size={14} />
            Medium Priority
          </span>
                );
            case 'low':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 size={14} />
            Low Priority
          </span>
                );
        }
    };

    const getTimeAgo = (dateString: string) => {
        const now = new Date();
        const submitted = new Date(dateString);
        const diffMs = now.getTime() - submitted.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <Edit className="text-blue-600" size={40} />
                    Grading Queue
                </h1>
                <p className="text-gray-600">Review and grade student submissions with AI assistance</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg text-white shadow-lg">
                    <div className="text-3xl font-bold">{stats.total}</div>
                    <div className="text-xs text-blue-100 mt-1">Total Pending</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-700">{stats.high}</div>
                    <div className="text-xs text-red-600 mt-1">High Priority</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">{stats.medium}</div>
                    <div className="text-xs text-amber-600 mt-1">Medium Priority</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{stats.low}</div>
                    <div className="text-xs text-green-600 mt-1">Low Priority</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-700">{stats.late}</div>
                    <div className="text-xs text-purple-600 mt-1">Late Submissions</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="text-2xl font-bold text-orange-700">{stats.flagged}</div>
                    <div className="text-xs text-orange-600 mt-1">Flagged</div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold mb-2">You&#39;re doing great! 🎉</h3>
                        <p className="text-blue-100 text-sm">
                            {stats.total} submissions waiting for your expert review. AI has pre-analyzed all submissions to help speed up your grading.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold">{Math.round((stats.total / (stats.total + 15)) * 100)}%</div>
                        <div className="text-blue-100 text-sm">Grading Progress</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
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
                                <option value="priority">Priority</option>
                                <option value="date">Date (Oldest First)</option>
                                <option value="plagiarism">Plagiarism (High to Low)</option>
                                <option value="ai">AI Score (Low to High)</option>
                            </select>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Filter size={20} className="text-gray-400" />
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value as never)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Priorities</option>
                                <option value="high">High Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="low">Low Priority</option>
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
                    </div>
                </div>
            </div>

            {/* Grading Queue List */}
            <div className="space-y-4">
                {sortedQueue.map((item) => (
                    <div
                        key={item.id}
                        className={`bg-white rounded-lg shadow-sm border-2 p-6 hover:shadow-lg transition-all cursor-pointer ${
                            item.priority === 'high' ? 'border-red-200 bg-red-50/30' :
                                item.priority === 'medium' ? 'border-amber-200 bg-amber-50/30' :
                                    'border-gray-200'
                        }`}
                        onClick={() => router.push(`/submissions/lecturer/grading/${item.id}`)}
                    >
                        <div className="flex items-start justify-between">
                            {/* Left Section */}
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        {item.student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold text-gray-900">{item.student.name}</h3>
                                            <span className="text-xs text-gray-500">{item.student.studentId}</span>
                                            {getPriorityBadge(item.priority)}
                                            {item.isLate && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <Clock size={12} />
                          Late by {item.daysOverdue} day{item.daysOverdue! > 1 ? 's' : ''}
                        </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600">{item.assignment.title}</p>
                                        <p className="text-xs text-gray-500">{item.assignment.module}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="text-gray-400" size={16} />
                                        <div>
                                            <div className="text-xs text-gray-500">Submitted</div>
                                            <div className="font-medium text-gray-700">{getTimeAgo(item.submittedAt)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <GitBranch className="text-purple-600" size={16} />
                                        <div>
                                            <div className="text-xs text-gray-500">Version</div>
                                            <div className="font-medium text-gray-700">{item.version}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileText className="text-blue-600" size={16} />
                                        <div>
                                            <div className="text-xs text-gray-500">Words</div>
                                            <div className="font-medium text-gray-700">{item.wordCount}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Award className="text-amber-600" size={16} />
                                        <div>
                                            <div className="text-xs text-gray-500">Max Marks</div>
                                            <div className="font-medium text-gray-700">{item.assignment.totalMarks}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <TrendingUp className="text-green-600" size={16} />
                                        <div>
                                            <div className="text-xs text-gray-500">Versions</div>
                                            <div className="font-medium text-gray-700">{item.version} saved</div>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Analysis Summary */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Star className="text-purple-600" size={16} />
                                            <span className="text-xs text-gray-600">AI Quality Score</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-bold text-purple-600">{item.aiScore}</span>
                                            <span className="text-sm text-gray-500">/100</span>
                                        </div>
                                    </div>

                                    <div className={`p-3 rounded-lg border ${
                                        item.plagiarismScore < 20
                                            ? 'bg-green-50 border-green-200'
                                            : item.plagiarismScore < 30
                                                ? 'bg-amber-50 border-amber-200'
                                                : 'bg-red-50 border-red-200'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Shield className={
                                                item.plagiarismScore < 20 ? 'text-green-600' :
                                                    item.plagiarismScore < 30 ? 'text-amber-600' :
                                                        'text-red-600'
                                            } size={16} />
                                            <span className="text-xs text-gray-600">Plagiarism</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-bold ${
                          item.plagiarismScore < 20 ? 'text-green-600' :
                              item.plagiarismScore < 30 ? 'text-amber-600' :
                                  'text-red-600'
                      }`}>
                        {item.plagiarismScore}%
                      </span>
                                            {item.plagiarismScore >= 20 && (
                                                <AlertTriangle className="text-red-500" size={16} />
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Edit className="text-blue-600" size={16} />
                                            <span className="text-xs text-gray-600">Status</span>
                                        </div>
                                        <div className="text-sm font-bold text-blue-600">
                                            Ready to Grade
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Section - Action Button */}
                            <div className="ml-4 flex flex-col items-end gap-3">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/submissions/lecturer/grading/${item.id}`);
                                    }}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-lg"
                                >
                                    <Edit size={20} />
                                    Start Grading
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/submissions/lecturer/submissions/${item.id}`);
                                    }}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                                >
                                    <Eye size={16} />
                                    Preview
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {sortedQueue.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up! 🎉</h3>
                        <p className="text-gray-500">
                            {gradingQueue.length === 0
                                ? 'No submissions pending grading.'
                                : 'No submissions match your current filters.'}
                        </p>
                        {gradingQueue.length > 0 && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setFilterPriority('all');
                                    setFilterAssignment('all');
                                }}
                                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Tips Card */}
            <div className="mt-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <Star className="text-yellow-300" size={24} />
                    Grading Tips
                </h3>
                <ul className="space-y-2 text-sm text-blue-100">
                    <li>• <strong>AI-Assisted:</strong> Review and modify AI-generated feedback to save time</li>
                    <li>• <strong>Priority System:</strong> High priority items include late submissions and high plagiarism scores</li>
                    <li>• <strong>Version History:</strong> Access all student versions to see their improvement</li>
                    <li>• <strong>Batch Grading:</strong> Grade similar assignments together for consistency</li>
                </ul>
            </div>
        </div>
    );
}