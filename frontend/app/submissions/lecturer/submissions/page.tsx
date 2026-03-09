'use client';

import React, { useState, useMemo } from 'react';
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
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import { useAllSubmissions } from '@/hooks/useSubmissions';
import type { Submission, SubmissionStatus } from '@/types/submission.types';

// ─── Helpers ──────────────────────────────────────────────────

type SortKey = 'date' | 'plagiarism' | 'ai';
type FilterStatus = 'all' | SubmissionStatus;

function StatusBadge({ status }: { status: SubmissionStatus }) {
    const cfg: Record<SubmissionStatus, { label: string; icon: React.ReactNode; cls: string }> = {
        SUBMITTED:      { label: 'Submitted',     icon: <Clock size={14} />,          cls: 'bg-blue-100 text-blue-700' },
        PENDING_REVIEW: { label: 'Pending Review', icon: <Clock size={14} />,          cls: 'bg-amber-100 text-amber-700' },
        GRADED:         { label: 'Graded',         icon: <CheckCircle2 size={14} />,   cls: 'bg-green-100 text-green-700' },
        FLAGGED:        { label: 'Flagged',        icon: <AlertTriangle size={14} />,  cls: 'bg-red-100 text-red-700' },
        LATE:           { label: 'Late',           icon: <AlertTriangle size={14} />,  cls: 'bg-purple-100 text-purple-700' },
        DRAFT:          { label: 'Draft',          icon: <FileText size={14} />,       cls: 'bg-gray-100 text-gray-600' },
    };
    const { label, icon, cls } = cfg[status] ?? cfg.DRAFT;
    return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${cls}`}>
            {icon}
            {label}
        </span>
    );
}

// ─── Skeleton row ──────────────────────────────────────────────

function SkeletonRow() {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                    <div className="grid grid-cols-3 gap-3 mt-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Submission card ──────────────────────────────────────────

function SubmissionRow({
    submission,
    onView,
    onGrade,
}: {
    submission: Submission;
    onView: (id: string) => void;
    onGrade: (id: string) => void;
}) {
    const plagHigh = (submission.plagiarismScore ?? 0) >= 20;
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                {/* Left */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <User className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">
                                    {submission.studentId}
                                </h3>
                                {(submission.moduleName || submission.moduleCode) && (
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {submission.moduleName ?? submission.moduleCode}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-600">
                                {submission.assignmentTitle ?? `Assignment ${submission.assignmentId}`}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {submission.submittedAt && (
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="text-gray-400" size={16} />
                                <span className="text-gray-700">
                                    {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                            <GitBranch className="text-purple-600" size={16} />
                            <span className="text-gray-700">Version {submission.currentVersionNumber}</span>
                        </div>
                        {submission.wordCount != null && (
                            <div className="flex items-center gap-2 text-sm">
                                <FileText className="text-blue-600" size={16} />
                                <span className="text-gray-700">{submission.wordCount} words</span>
                            </div>
                        )}
                        {submission.totalMarks != null && (
                            <div className="flex items-center gap-2 text-sm">
                                <Award className="text-amber-600" size={16} />
                                <span className="text-gray-700">{submission.totalMarks} marks</span>
                            </div>
                        )}
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-1">
                                <Star className="text-purple-600" size={16} />
                                <span className="text-xs text-gray-600">AI Score</span>
                            </div>
                            <div className="text-lg font-bold text-purple-600">
                                {submission.aiScore != null ? `${submission.aiScore}/100` : '—'}
                            </div>
                        </div>

                        <div className={`p-3 rounded-lg border ${plagHigh ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className={plagHigh ? 'text-red-600' : 'text-green-600'} size={16} />
                                <span className="text-xs text-gray-600">Plagiarism</span>
                            </div>
                            <div className={`text-lg font-bold ${plagHigh ? 'text-red-600' : 'text-green-600'}`}>
                                {submission.plagiarismScore != null ? `${submission.plagiarismScore}%` : '—'}
                            </div>
                        </div>

                        {submission.grade != null ? (
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

                {/* Right — status + actions */}
                <div className="flex flex-col items-end gap-3 ml-4 shrink-0">
                    <StatusBadge status={submission.status} />

                    <div className="flex gap-2">
                        <button
                            onClick={() => onView(submission.id)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm cursor-pointer"
                        >
                            <Eye size={16} />
                            View
                        </button>
                        {submission.status !== 'GRADED' && (
                            <button
                                onClick={() => onGrade(submission.id)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm cursor-pointer"
                            >
                                <Edit size={16} />
                                Grade
                            </button>
                        )}
                    </div>

                    {plagHigh && (
                        <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle size={14} />
                            High plagiarism
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function LecturerAllSubmissionsPage() {
    const router = useRouter();

    const [searchQuery, setSearchQuery]         = useState('');
    const [filterStatus, setFilterStatus]       = useState<FilterStatus>('all');
    const [sortBy, setSortBy]                   = useState<SortKey>('date');

    const { data: submissions, loading, error, refetch } = useAllSubmissions();

    // Client-side filtering and sorting on top of the full list
    const processed = useMemo(() => {
        const list = submissions ?? [];

        const filtered = list.filter(s => {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                !q ||
                s.studentId.toLowerCase().includes(q) ||
                (s.assignmentTitle ?? '').toLowerCase().includes(q) ||
                (s.moduleCode ?? '').toLowerCase().includes(q);
            const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
            return matchesSearch && matchesStatus;
        });

        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return (
                        new Date(b.submittedAt ?? 0).getTime() -
                        new Date(a.submittedAt ?? 0).getTime()
                    );
                case 'plagiarism':
                    return (b.plagiarismScore ?? 0) - (a.plagiarismScore ?? 0);
                case 'ai':
                    return (b.aiScore ?? 0) - (a.aiScore ?? 0);
                default:
                    return 0;
            }
        });
    }, [submissions, searchQuery, filterStatus, sortBy]);

    const stats = useMemo(() => {
        const list = submissions ?? [];
        return {
            total:   list.length,
            pending: list.filter(s => s.status === 'PENDING_REVIEW' || s.status === 'SUBMITTED').length,
            graded:  list.filter(s => s.status === 'GRADED').length,
            flagged: list.filter(s => s.status === 'FLAGGED').length,
            late:    list.filter(s => s.status === 'LATE').length,
        };
    }, [submissions]);

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">All Submissions</h1>
                    <p className="text-gray-600">Review and grade student submissions</p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
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

            {/* Error banner */}
            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-800">Could not load live data</p>
                        <p className="text-sm text-amber-700 mt-0.5">{error}</p>
                        <p className="text-sm text-amber-600 mt-1">
                            Check that your backend services are running on the correct ports.
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by student ID, assignment title, or module..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 whitespace-nowrap">Sort by:</label>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as SortKey)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="date">Date</option>
                                <option value="plagiarism">Plagiarism</option>
                                <option value="ai">AI Score</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Filter size={20} className="text-gray-400" />
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value as FilterStatus)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="SUBMITTED">Submitted</option>
                                <option value="PENDING_REVIEW">Pending Review</option>
                                <option value="GRADED">Graded</option>
                                <option value="FLAGGED">Flagged</option>
                                <option value="LATE">Late</option>
                                <option value="DRAFT">Draft</option>
                            </select>
                        </div>

                        <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 cursor-pointer">
                            <Download size={18} />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Submissions list */}
            <div className="space-y-4">
                {loading && !submissions ? (
                    [1, 2, 3].map(i => <SkeletonRow key={i} />)
                ) : processed.length > 0 ? (
                    processed.map(submission => (
                        <SubmissionRow
                            key={submission.id}
                            submission={submission}
                            onView={id => router.push(`/submissions/lecturer/submissions/${id}`)}
                            onGrade={id => router.push(`/submissions/lecturer/grading/${id}`)}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">
                            {submissions?.length === 0 ? 'No submissions yet' : 'No submissions match your filters'}
                        </p>
                        {(searchQuery || filterStatus !== 'all') && (
                            <button
                                onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                                className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
