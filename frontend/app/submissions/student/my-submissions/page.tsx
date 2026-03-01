'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Award,
    FileText,
    GitBranch,
    Loader,
    Plus,
    RefreshCw,
    Shield,
    Star,
    AlertCircle,
} from 'lucide-react';
import SubmissionCard from '@/components/submissions/SubmissionCard';
import { useSubmissions } from '@/hooks/useSubmissions';
import type { Submission, SubmissionStatus } from '@/types/submission.types';

// ─── Skeleton loading ─────────────────────────────────────────

function SubmissionCardSkeleton() {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="grid grid-cols-4 gap-3 mt-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Stat card ────────────────────────────────────────────────

function StatCard({
    value,
    label,
    colorClass,
    bgClass,
    borderClass,
}: {
    value: number | string;
    label: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
}) {
    return (
        <div className={`p-4 rounded-lg border ${bgClass} ${borderClass}`}>
            <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
            <div className="text-xs text-gray-600 mt-1">{label}</div>
        </div>
    );
}

// ─── Filter buttons ───────────────────────────────────────────

type Filter = 'all' | SubmissionStatus;

const FILTERS: { key: Filter; label: string; activeClass: string }[] = [
    { key: 'all',          label: 'All',            activeClass: 'bg-gray-800 text-white' },
    { key: 'GRADED',       label: 'Graded',         activeClass: 'bg-green-600 text-white' },
    { key: 'SUBMITTED',    label: 'Submitted',      activeClass: 'bg-purple-600 text-white' },
    { key: 'PENDING_REVIEW', label: 'Pending Review', activeClass: 'bg-amber-500 text-white' },
    { key: 'DRAFT',        label: 'Draft',          activeClass: 'bg-gray-500 text-white' },
];

// ─── Page ─────────────────────────────────────────────────────

export default function MySubmissionsPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<Filter>('all');
    const [studentId, setStudentId] = useState<string | null>(null);

    // Decode student ID from JWT
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setStudentId(payload.userId ?? payload.sub ?? null);
            }
        } catch {
            setStudentId(null);
        }
    }, []);

    const { data: submissions, loading, error, refetch } = useSubmissions(studentId);

    // ── Filtered list
    const filtered = useMemo(() => {
        if (!submissions) return [];
        if (filter === 'all') return submissions;
        return submissions.filter((s) => s.status === filter);
    }, [submissions, filter]);

    // ── Computed stats
    const stats = useMemo(() => {
        const list = submissions ?? [];
        const graded = list.filter((s) => s.status === 'GRADED');
        return {
            total: list.length,
            graded: graded.length,
            submitted: list.filter((s) => s.status === 'SUBMITTED').length,
            pending: list.filter((s) => s.status === 'PENDING_REVIEW').length,
            draft: list.filter((s) => s.status === 'DRAFT').length,
            avgGrade:
                graded.length > 0
                    ? Math.round(
                          graded.reduce((acc, s) => acc + (s.grade ?? 0), 0) / graded.length
                      )
                    : null,
            totalVersions: list.reduce((acc, s) => acc + s.totalVersions, 0),
        };
    }, [submissions]);

    // ── Filter button counts
    const countFor = (f: Filter) => {
        if (!submissions) return 0;
        return f === 'all' ? submissions.length : submissions.filter((s) => s.status === f).length;
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">My Submissions</h1>
                    <p className="text-gray-600">
                        View all your submitted assignments, grades and feedback
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => refetch()}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={() => router.push('/submissions/student/submit')}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold shadow-md"
                    >
                        <Plus size={16} />
                        New Submission
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
                <StatCard value={stats.total}    label="Total"         colorClass="text-gray-900"   bgClass="bg-white"        borderClass="border-gray-200" />
                <StatCard value={stats.graded}   label="Graded"        colorClass="text-green-700"  bgClass="bg-green-50"     borderClass="border-green-200" />
                <StatCard value={stats.submitted} label="Submitted"    colorClass="text-purple-700" bgClass="bg-purple-50"    borderClass="border-purple-200" />
                <StatCard value={stats.pending}  label="Pending"       colorClass="text-amber-700"  bgClass="bg-amber-50"     borderClass="border-amber-200" />
                <StatCard value={stats.draft}    label="Drafts"        colorClass="text-gray-600"   bgClass="bg-gray-50"      borderClass="border-gray-200" />
                <StatCard
                    value={stats.avgGrade != null ? `${stats.avgGrade}%` : '–'}
                    label="Avg Grade"
                    colorClass="text-blue-700"
                    bgClass="bg-blue-50"
                    borderClass="border-blue-200"
                />
                <StatCard
                    value={stats.totalVersions}
                    label="Total Versions"
                    colorClass="text-indigo-700"
                    bgClass="bg-indigo-50"
                    borderClass="border-indigo-200"
                />
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Filter:</span>
                    <div className="flex flex-wrap gap-2">
                        {FILTERS.map(({ key, label, activeClass }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    filter === key
                                        ? activeClass
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {label} ({countFor(key)})
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-800">Could not load live data</p>
                        <p className="text-sm text-amber-700 mt-0.5">{error}</p>
                        <p className="text-sm text-amber-600 mt-1">
                            Showing sample data below. Check that your backend services are running.
                        </p>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => <SubmissionCardSkeleton key={i} />)}
                </div>
            ) : filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map((submission) => (
                        <SubmissionCard
                            key={submission.id}
                            submission={submission}
                            onView={(id) =>
                                router.push(`/submissions/student/my-submissions/${id}`)
                            }
                            onVersionHistory={(id) =>
                                router.push(`/submissions/student/version-history/${id}`)
                            }
                            onPlagiarismReport={(id) =>
                                router.push(`/submissions/student/plagiarism/${id}`)
                            }
                        />
                    ))}
                </div>
            ) : error ? (
                /* Fallback sample data when backend is unavailable */
                <FallbackSubmissions router={router} />
            ) : (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <FileText size={52} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg font-medium">
                        {filter === 'all' ? 'No submissions yet' : `No ${filter.toLowerCase()} submissions`}
                    </p>
                    {filter !== 'all' ? (
                        <button
                            onClick={() => setFilter('all')}
                            className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                            Show all submissions
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push('/submissions/student/submit')}
                            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                            <Plus size={18} />
                            Make Your First Submission
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Fallback sample data (shown when backend unavailable) ────

function FallbackSubmissions({ router }: { router: ReturnType<typeof useRouter> }) {
    const SAMPLE: Submission[] = [
        {
            id: '1',
            studentId: 'demo',
            assignmentId: 'a1',
            assignmentTitle: 'Python Programming Basics',
            moduleCode: 'CS1001',
            moduleName: 'Programming Fundamentals',
            status: 'GRADED',
            submittedAt: '2025-01-04T18:30:00',
            currentVersionNumber: 5,
            totalVersions: 5,
            grade: 95,
            totalMarks: 100,
            plagiarismScore: 3,
            aiScore: 92,
            wordCount: 1250,
            createdAt: '2025-01-01T10:00:00',
            files: [],
            lecturerFeedback: 'Excellent work! Your code is well-structured.',
        },
        {
            id: '2',
            studentId: 'demo',
            assignmentId: 'a2',
            assignmentTitle: 'Data Structures Implementation',
            moduleCode: 'CS2002',
            moduleName: 'Data Structures & Algorithms',
            status: 'SUBMITTED',
            submittedAt: '2025-01-07T22:45:00',
            currentVersionNumber: 4,
            totalVersions: 4,
            totalMarks: 100,
            plagiarismScore: 8,
            aiScore: 88,
            wordCount: 2100,
            createdAt: '2025-01-05T14:00:00',
            files: [],
        },
        {
            id: '3',
            studentId: 'demo',
            assignmentId: 'a3',
            assignmentTitle: 'Software Development Lifecycle Quiz',
            moduleCode: 'SE2001',
            moduleName: 'Software Engineering',
            status: 'PENDING_REVIEW',
            submittedAt: '2025-01-08T17:15:00',
            currentVersionNumber: 2,
            totalVersions: 2,
            totalMarks: 50,
            plagiarismScore: 5,
            aiScore: 85,
            wordCount: 850,
            createdAt: '2025-01-07T09:00:00',
            files: [],
        },
    ];

    return (
        <div className="space-y-4">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 text-center">
                Showing sample data — connect your backend to see real submissions
            </div>
            {SAMPLE.map((submission) => (
                <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    onView={(id) => router.push(`/submissions/student/my-submissions/${id}`)}
                    onVersionHistory={(id) =>
                        router.push(`/submissions/student/version-history/${id}`)
                    }
                    onPlagiarismReport={(id) =>
                        router.push(`/submissions/student/plagiarism/${id}`)
                    }
                />
            ))}
        </div>
    );
}
