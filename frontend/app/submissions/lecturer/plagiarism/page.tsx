'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield,
    AlertTriangle,
    Search,
    Filter,
    User,
    FileText,
    Calendar,
    Eye,
    Download,
    TrendingUp,
    TrendingDown,
    Globe,
    CheckCircle2,
    XCircle,
    Flag,
    GitCompare,
} from 'lucide-react';

interface FlaggedSubmission {
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
    };
    submittedAt: string;
    plagiarismScore: number;
    previousScore?: number;
    status: 'pending-review' | 'reviewed' | 'false-positive' | 'confirmed';
    sourcesChecked: number;
    matchesFound: number;
    topMatches: {
        source: string;
        percentage: number;
        type: string;
        url?: string;
    }[];
    reviewedBy?: string;
    reviewedAt?: string;
    notes?: string;
}

export default function LecturerPlagiarismDetectionPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending-review' | 'reviewed' | 'false-positive' | 'confirmed'>('all');
    const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
    const [sortBy, setSortBy] = useState<'score' | 'date' | 'matches'>('score');

    // Hardcoded flagged submissions data
    const flaggedSubmissions: FlaggedSubmission[] = [
        {
            id: 's1',
            student: {
                id: 'stu1',
                name: 'David Brown',
                studentId: 'STU004',
            },
            assignment: {
                id: 'a1',
                title: 'Database Design and Normalization',
                module: 'CS3001',
            },
            submittedAt: '2025-01-08 19:20',
            plagiarismScore: 28,
            previousScore: 15,
            status: 'pending-review',
            sourcesChecked: 1350,
            matchesFound: 7,
            topMatches: [
                {
                    source: 'Database Normalization Tutorial - TutorialsPoint',
                    percentage: 12,
                    type: 'Direct content match',
                    url: 'https://tutorialspoint.com/dbms/normalization',
                },
                {
                    source: 'Wikipedia - Database Normalization',
                    percentage: 8,
                    type: 'General knowledge',
                    url: 'https://wikipedia.org/wiki/Database_normalization',
                },
                {
                    source: 'GeeksforGeeks - DBMS Normalization',
                    percentage: 5,
                    type: 'Technical examples',
                    url: 'https://geeksforgeeks.org/normalization',
                },
                {
                    source: 'Course Textbook - Chapter 6',
                    percentage: 3,
                    type: 'Definitions',
                },
            ],
        },
        {
            id: 's2',
            student: {
                id: 'stu2',
                name: 'Frank Martinez',
                studentId: 'STU006',
            },
            assignment: {
                id: 'a2',
                title: 'Software Development Lifecycle Quiz',
                module: 'SE2001',
            },
            submittedAt: '2025-01-08 15:45',
            plagiarismScore: 35,
            previousScore: 42,
            status: 'pending-review',
            sourcesChecked: 980,
            matchesFound: 9,
            topMatches: [
                {
                    source: 'Agile Development Blog',
                    percentage: 18,
                    type: 'Tutorial content',
                    url: 'https://agilemanifesto.org/principles',
                },
                {
                    source: 'Scrum.org - Scrum Guide',
                    percentage: 10,
                    type: 'Framework documentation',
                    url: 'https://scrum.org/resources/scrum-guide',
                },
                {
                    source: 'Another Student Submission (2023)',
                    percentage: 7,
                    type: 'Student work',
                },
            ],
        },
        {
            id: 's3',
            student: {
                id: 'stu3',
                name: 'Isaac Thompson',
                studentId: 'STU012',
            },
            assignment: {
                id: 'a3',
                title: 'Object-Oriented Programming Concepts',
                module: 'CS2001',
            },
            submittedAt: '2025-01-03 22:15',
            plagiarismScore: 42,
            status: 'confirmed',
            sourcesChecked: 890,
            matchesFound: 12,
            topMatches: [
                {
                    source: 'OOP Tutorial Website - JavaPoint',
                    percentage: 25,
                    type: 'Direct content match',
                    url: 'https://javapoint.com/oop-concepts',
                },
                {
                    source: 'Stack Overflow - Multiple Answers',
                    percentage: 10,
                    type: 'Code snippets',
                    url: 'https://stackoverflow.com/questions/tagged/oop',
                },
                {
                    source: 'Programming Blog - OOP Basics',
                    percentage: 7,
                    type: 'Tutorial content',
                },
            ],
            reviewedBy: 'Dr. Smith',
            reviewedAt: '2025-01-04 10:30',
            notes: 'Confirmed plagiarism. Multiple paragraphs copied verbatim from online sources. Student has been notified.',
        },
        {
            id: 's4',
            student: {
                id: 'stu4',
                name: 'Jessica Wang',
                studentId: 'STU015',
            },
            assignment: {
                id: 'a1',
                title: 'Database Design and Normalization',
                module: 'CS3001',
            },
            submittedAt: '2025-01-07 18:30',
            plagiarismScore: 22,
            status: 'false-positive',
            sourcesChecked: 1200,
            matchesFound: 5,
            topMatches: [
                {
                    source: 'Course Lecture Slides',
                    percentage: 15,
                    type: 'Course material',
                },
                {
                    source: 'Recommended Textbook',
                    percentage: 7,
                    type: 'Standard definitions',
                },
            ],
            reviewedBy: 'Dr. Smith',
            reviewedAt: '2025-01-08 09:15',
            notes: 'False positive. Matches are from course materials and standard terminology. Student properly cited sources.',
        },
        {
            id: 's5',
            student: {
                id: 'stu5',
                name: 'Kevin Liu',
                studentId: 'STU018',
            },
            assignment: {
                id: 'a4',
                title: 'Python Programming Basics',
                module: 'CS1001',
            },
            submittedAt: '2025-01-06 16:45',
            plagiarismScore: 31,
            status: 'reviewed',
            sourcesChecked: 1100,
            matchesFound: 8,
            topMatches: [
                {
                    source: 'Python Official Documentation',
                    percentage: 12,
                    type: 'Documentation',
                    url: 'https://docs.python.org',
                },
                {
                    source: 'Real Python Tutorial',
                    percentage: 11,
                    type: 'Tutorial content',
                    url: 'https://realpython.com/python-basics',
                },
                {
                    source: 'GitHub Repository - Python Examples',
                    percentage: 8,
                    type: 'Code examples',
                },
            ],
            reviewedBy: 'Dr. Johnson',
            reviewedAt: '2025-01-07 14:20',
            notes: 'Under review. Student claims to have used official documentation as reference. Requested revision with proper citations.',
        },
        {
            id: 's6',
            student: {
                id: 'stu6',
                name: 'Laura Chen',
                studentId: 'STU021',
            },
            assignment: {
                id: 'a2',
                title: 'Software Development Lifecycle Quiz',
                module: 'SE2001',
            },
            submittedAt: '2025-01-08 14:00',
            plagiarismScore: 26,
            status: 'pending-review',
            sourcesChecked: 1050,
            matchesFound: 6,
            topMatches: [
                {
                    source: 'Atlassian Agile Guide',
                    percentage: 14,
                    type: 'Methodology documentation',
                    url: 'https://atlassian.com/agile',
                },
                {
                    source: 'PMI - Project Management Guide',
                    percentage: 8,
                    type: 'Industry standards',
                },
                {
                    source: 'Course Forum Discussion',
                    percentage: 4,
                    type: 'Student collaboration',
                },
            ],
        },
        {
            id: 's7',
            student: {
                id: 'stu7',
                name: 'Michael Rodriguez',
                studentId: 'STU024',
            },
            assignment: {
                id: 'a3',
                title: 'Data Structures Implementation',
                module: 'CS2002',
            },
            submittedAt: '2025-01-08 11:30',
            plagiarismScore: 38,
            status: 'pending-review',
            sourcesChecked: 1400,
            matchesFound: 10,
            topMatches: [
                {
                    source: 'GeeksforGeeks - Data Structures',
                    percentage: 20,
                    type: 'Tutorial with code',
                    url: 'https://geeksforgeeks.org/data-structures',
                },
                {
                    source: 'LeetCode Solution Discussion',
                    percentage: 12,
                    type: 'Community solution',
                    url: 'https://leetcode.com/discuss',
                },
                {
                    source: 'YouTube Tutorial Transcript',
                    percentage: 6,
                    type: 'Video content',
                },
            ],
        },
        {
            id: 's8',
            student: {
                id: 'stu8',
                name: 'Nina Patel',
                studentId: 'STU027',
            },
            assignment: {
                id: 'a1',
                title: 'Database Design and Normalization',
                module: 'CS3001',
            },
            submittedAt: '2025-01-08 20:00',
            plagiarismScore: 24,
            status: 'pending-review',
            sourcesChecked: 1280,
            matchesFound: 5,
            topMatches: [
                {
                    source: 'Database Design Book - Chapter 5',
                    percentage: 10,
                    type: 'Textbook content',
                },
                {
                    source: 'SQL Tutorial Website',
                    percentage: 9,
                    type: 'Query examples',
                    url: 'https://w3schools.com/sql',
                },
                {
                    source: 'Oracle Documentation',
                    percentage: 5,
                    type: 'Technical documentation',
                },
            ],
        },
    ];

    const filteredSubmissions = flaggedSubmissions.filter(submission => {
        const matchesSearch = submission.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            submission.student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            submission.assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;

        let matchesSeverity = true;
        if (filterSeverity !== 'all') {
            if (filterSeverity === 'critical' && submission.plagiarismScore < 40) matchesSeverity = false;
            if (filterSeverity === 'high' && (submission.plagiarismScore < 30 || submission.plagiarismScore >= 40)) matchesSeverity = false;
            if (filterSeverity === 'medium' && (submission.plagiarismScore < 20 || submission.plagiarismScore >= 30)) matchesSeverity = false;
        }

        return matchesSearch && matchesStatus && matchesSeverity;
    });

    const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
        switch (sortBy) {
            case 'score':
                return b.plagiarismScore - a.plagiarismScore;
            case 'date':
                return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
            case 'matches':
                return b.matchesFound - a.matchesFound;
            default:
                return 0;
        }
    });

    const stats = {
        total: flaggedSubmissions.length,
        pendingReview: flaggedSubmissions.filter(s => s.status === 'pending-review').length,
        confirmed: flaggedSubmissions.filter(s => s.status === 'confirmed').length,
        falsePositive: flaggedSubmissions.filter(s => s.status === 'false-positive').length,
        reviewed: flaggedSubmissions.filter(s => s.status === 'reviewed').length,
        critical: flaggedSubmissions.filter(s => s.plagiarismScore >= 40).length,
        high: flaggedSubmissions.filter(s => s.plagiarismScore >= 30 && s.plagiarismScore < 40).length,
        medium: flaggedSubmissions.filter(s => s.plagiarismScore >= 20 && s.plagiarismScore < 30).length,
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending-review':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <AlertTriangle size={14} />
            Pending Review
          </span>
                );
            case 'confirmed':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle size={14} />
            Confirmed
          </span>
                );
            case 'false-positive':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 size={14} />
            False Positive
          </span>
                );
            case 'reviewed':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Eye size={14} />
            Reviewed
          </span>
                );
        }
    };

    const getSeverityColor = (score: number) => {
        if (score >= 40) return 'bg-red-100 border-red-300 text-red-700';
        if (score >= 30) return 'bg-orange-100 border-orange-300 text-orange-700';
        return 'bg-amber-100 border-amber-300 text-amber-700';
    };

    const handleMarkAsReviewed = (id: string, status: 'confirmed' | 'false-positive' | 'reviewed') => {
        alert(`Marking submission ${id} as ${status}`);
        // API call would go here
    };

    const handleExportReport = (id: string) => {
        alert(`Exporting plagiarism report for submission ${id}`);
        // Export functionality would go here
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <Shield className="text-red-600" size={40} />
                    Plagiarism Detection
                </h1>
                <p className="text-gray-600">Review and manage flagged submissions for academic integrity</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-lg text-white shadow-lg">
                    <div className="text-3xl font-bold">{stats.total}</div>
                    <div className="text-xs text-red-100 mt-1">Total Flagged</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">{stats.pendingReview}</div>
                    <div className="text-xs text-amber-600 mt-1">Pending</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-700">{stats.confirmed}</div>
                    <div className="text-xs text-red-600 mt-1">Confirmed</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{stats.falsePositive}</div>
                    <div className="text-xs text-green-600 mt-1">False Positive</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{stats.reviewed}</div>
                    <div className="text-xs text-blue-600 mt-1">Reviewed</div>
                </div>
                <div className="bg-red-100 p-4 rounded-lg border border-red-300">
                    <div className="text-2xl font-bold text-red-800">{stats.critical}</div>
                    <div className="text-xs text-red-700 mt-1">Critical (40%+)</div>
                </div>
                <div className="bg-orange-100 p-4 rounded-lg border border-orange-300">
                    <div className="text-2xl font-bold text-orange-800">{stats.high}</div>
                    <div className="text-xs text-orange-700 mt-1">High (30-39%)</div>
                </div>
                <div className="bg-amber-100 p-4 rounded-lg border border-amber-300">
                    <div className="text-2xl font-bold text-amber-800">{stats.medium}</div>
                    <div className="text-xs text-amber-700 mt-1">Medium (20-29%)</div>
                </div>
            </div>

            {/* Alert Banner */}
            {stats.pendingReview > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-6 rounded-r-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 mt-0.5" size={24} />
                        <div>
                            <h3 className="font-bold text-amber-900 mb-1">Action Required</h3>
                            <p className="text-sm text-amber-800">
                                {stats.pendingReview} submission{stats.pendingReview > 1 ? 's' : ''} {stats.pendingReview > 1 ? 'are' : 'is'} waiting for your review.
                                Please review and mark as confirmed plagiarism or false positive.
                            </p>
                        </div>
                    </div>
                </div>
            )}

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
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 whitespace-nowrap">Sort by:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <option value="score">Plagiarism % (High to Low)</option>
                                <option value="date">Date (Newest First)</option>
                                <option value="matches">Matches Found</option>
                            </select>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Filter size={20} className="text-gray-400" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <option value="all">All Status</option>
                                <option value="pending-review">Pending Review</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="false-positive">False Positive</option>
                            </select>
                        </div>

                        <select
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value as any)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="all">All Severity</option>
                            <option value="critical">Critical (40%+)</option>
                            <option value="high">High (30-39%)</option>
                            <option value="medium">Medium (20-29%)</option>
                        </select>

                        <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2">
                            <Download size={18} />
                            Export All
                        </button>
                    </div>
                </div>
            </div>

            {/* Flagged Submissions List */}
            <div className="space-y-4">
                {sortedSubmissions.map((submission) => {
                    const trendUp = submission.previousScore && submission.plagiarismScore > submission.previousScore;
                    const trendDown = submission.previousScore && submission.plagiarismScore < submission.previousScore;

                    return (
                        <div
                            key={submission.id}
                            className={`bg-white rounded-lg shadow-sm border-2 p-6 ${getSeverityColor(submission.plagiarismScore).replace('text-', 'border-').replace('bg-', 'border-')}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                {/* Left Section */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                            {submission.student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-gray-900">{submission.student.name}</h3>
                                                <span className="text-xs text-gray-500">{submission.student.studentId}</span>
                                                {getStatusBadge(submission.status)}
                                            </div>
                                            <p className="text-sm text-gray-600">{submission.assignment.title}</p>
                                            <p className="text-xs text-gray-500">{submission.assignment.module}</p>
                                        </div>
                                    </div>

                                    {/* Plagiarism Score */}
                                    <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-lg border-2 ${getSeverityColor(submission.plagiarismScore)} mb-4`}>
                                        <Shield size={32} />
                                        <div>
                                            <div className="text-xs font-medium mb-1">Plagiarism Score</div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-bold">{submission.plagiarismScore}%</span>
                                                {submission.previousScore && (
                                                    <span className={`text-sm font-medium flex items-center gap-1 ${
                                                        trendUp ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                            {trendUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                        {Math.abs(submission.plagiarismScore - submission.previousScore)}%
                          </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Globe size={16} className="text-gray-400" />
                                                <span className="text-xs text-gray-600">Sources Checked</span>
                                            </div>
                                            <div className="text-xl font-bold text-gray-900">{submission.sourcesChecked.toLocaleString()}</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Flag size={16} className="text-gray-400" />
                                                <span className="text-xs text-gray-600">Matches Found</span>
                                            </div>
                                            <div className="text-xl font-bold text-gray-900">{submission.matchesFound}</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Calendar size={16} className="text-gray-400" />
                                                <span className="text-xs text-gray-600">Submitted</span>
                                            </div>
                                            <div className="text-sm font-bold text-gray-900">
                                                {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Top Matches */}
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-3">Top Matches:</p>
                                        <div className="space-y-2">
                                            {submission.topMatches.slice(0, 3).map((match, index) => (
                                                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-gray-900">{match.source}</p>
                                                            <p className="text-xs text-gray-600">{match.type}</p>
                                                        </div>
                                                        <div className="ml-4">
                                                            <span className="text-xl font-bold text-red-600">{match.percentage}%</span>
                                                        </div>
                                                    </div>
                                                    {match.url && (
                                                        <a
                                                            href={match.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                        >
                                                            <Globe size={12} />
                                                            View Source
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Review Notes */}
                                    {submission.notes && (
                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <FileText className="text-blue-600 mt-0.5" size={18} />
                                                <div>
                                                    <p className="text-sm font-medium text-blue-900 mb-1">Review Notes:</p>
                                                    <p className="text-sm text-blue-800">{submission.notes}</p>
                                                    {submission.reviewedBy && (
                                                        <p className="text-xs text-blue-600 mt-2">
                                                            Reviewed by {submission.reviewedBy} on {new Date(submission.reviewedAt!).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Section - Actions */}
                                <div className="ml-4 flex flex-col items-end gap-3">
                                    <button
                                        onClick={() => router.push(`/submissions/lecturer/submissions/${submission.id}`)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                                    >
                                        <Eye size={18} />
                                        View Details
                                    </button>

                                    <button
                                        onClick={() => handleExportReport(submission.id)}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                                    >
                                        <Download size={16} />
                                        Export Report
                                    </button>

                                    {submission.status === 'pending-review' && (
                                        <>
                                            <button
                                                onClick={() => handleMarkAsReviewed(submission.id, 'confirmed')}
                                                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                                            >
                                                <XCircle size={16} />
                                                Confirm Plagiarism
                                            </button>
                                            <button
                                                onClick={() => handleMarkAsReviewed(submission.id, 'false-positive')}
                                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                                            >
                                                <CheckCircle2 size={16} />
                                                False Positive
                                            </button>
                                        </>
                                    )}

                                    {submission.status === 'reviewed' && (
                                        <button
                                            onClick={() => router.push(`/submissions/lecturer/grading/${submission.id}`)}
                                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                                        >
                                            <GitCompare size={16} />
                                            Grade Submission
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {sortedSubmissions.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Flagged Submissions</h3>
                        <p className="text-gray-500">
                            {flaggedSubmissions.length === 0
                                ? 'All submissions have excellent academic integrity!'
                                : 'No submissions match your current filters.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Guidelines Card */}
            <div className="mt-8 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <Shield size={24} />
                    Plagiarism Review Guidelines
                </h3>
                <ul className="space-y-2 text-sm text-red-100">
                    <li>• <strong>20-29%:</strong> Medium concern - Review matches, may be acceptable with citations</li>
                    <li>• <strong>30-39%:</strong> High concern - Detailed review required, likely needs student explanation</li>
                    <li>• <strong>40%+:</strong> Critical - Strong evidence of plagiarism, formal action recommended</li>
                    <li>• <strong>False Positives:</strong> Common for course materials, textbook definitions, standard terminology</li>
                    <li>• <strong>Action Required:</strong> Document your decision and notify students promptly</li>
                </ul>
            </div>
        </div>
    );
}