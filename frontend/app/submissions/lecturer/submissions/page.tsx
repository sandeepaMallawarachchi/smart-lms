'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Calendar,
    GitBranch,
    Shield,
    Star,
    Eye,
    Edit,
    Filter,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Award,
    AlertCircle,
} from 'lucide-react';
import { useAllSubmissions } from '@/hooks/useSubmissions';
import {
    PageHeader,
    StatCard,
    Skeleton,
    FilterToolbar,
    SearchInput,
    EmptyState,
    ErrorBanner,
} from '@/components/submissions/lecturer/PageShell';
import type { Submission, SubmissionStatus } from '@/types/submission.types';

/* ─── Sub-components ───────────────────────────────────────── */

type SortKey = 'date' | 'plagiarism' | 'ai' | 'priority';
type FilterStatus = 'all' | 'NEEDS_GRADING' | SubmissionStatus;

const STATUS_CFG: Record<SubmissionStatus, { label: string; cls: string }> = {
    SUBMITTED:      { label: 'Submitted',      cls: 'bg-blue-100 text-blue-700' },
    PENDING_REVIEW: { label: 'Pending Review',  cls: 'bg-amber-100 text-amber-700' },
    GRADED:         { label: 'Graded',          cls: 'bg-green-100 text-green-700' },
    FLAGGED:        { label: 'Flagged',         cls: 'bg-red-100 text-red-700' },
    LATE:           { label: 'Late',            cls: 'bg-purple-100 text-purple-700' },
    DRAFT:          { label: 'Draft',           cls: 'bg-gray-100 text-gray-600' },
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
    const { label, cls } = STATUS_CFG[status] ?? STATUS_CFG.DRAFT;
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

type Priority = 'high' | 'medium' | 'low';

function getPriority(s: Submission): Priority {
    if ((s.plagiarismScore ?? 0) >= 25 || s.isLate) return 'high';
    if ((s.plagiarismScore ?? 0) >= 10 || s.currentVersionNumber > 3) return 'medium';
    return 'low';
}

const PRIORITY_CFG: Record<Priority, { label: string; cls: string }> = {
    high: { label: 'High', cls: 'bg-red-100 text-red-700' },
    medium: { label: 'Med', cls: 'bg-amber-100 text-amber-700' },
    low: { label: 'Low', cls: 'bg-green-100 text-green-700' },
};

function SubmissionRow({
    submission: s,
    onView,
    onGrade,
    showPriority,
}: {
    submission: Submission;
    onView: (id: string) => void;
    onGrade: (id: string) => void;
    showPriority?: boolean;
}) {
    const plagHigh = (s.plagiarismScore ?? 0) >= 20;
    const priority = getPriority(s);

    return (
        <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-all ${s.isLate ? 'border-l-4 border-l-purple-400 border-gray-200' : plagHigh ? 'border-l-4 border-l-red-400 border-gray-200' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between gap-3">
                {/* Left info */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{s.studentName ?? 'Unknown Student'}</span>
                        <StatusBadge status={s.status} />
                        {showPriority && s.status !== 'GRADED' && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_CFG[priority].cls}`}>{PRIORITY_CFG[priority].label}</span>
                        )}
                        {plagHigh && (
                            <span className="text-xs text-red-600 font-medium flex items-center gap-0.5">
                                <AlertTriangle size={11} /> Plagiarism
                            </span>
                        )}
                        {s.isLate && (
                            <span className="text-xs text-purple-600 font-medium flex items-center gap-0.5">
                                <Clock size={11} /> Late
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-600 mb-1.5 truncate">
                        {s.assignmentTitle ?? 'Untitled Assignment'}
                        {s.moduleCode && <span className="text-gray-400"> · {s.moduleName ?? s.moduleCode}</span>}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {s.submittedAt && (
                            <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <GitBranch size={12} /> v{s.currentVersionNumber}
                        </span>
                        {s.wordCount != null && (
                            <span className="flex items-center gap-1"><FileText size={12} /> {s.wordCount} words</span>
                        )}
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden md:flex gap-2">
                        <MetricBadge
                            icon={<Star size={12} className="text-purple-500" />}
                            value={s.aiScore != null ? `${s.aiScore}` : '—'}
                            sub="AI"
                        />
                        <MetricBadge
                            icon={<Shield size={12} className={plagHigh ? 'text-red-500' : 'text-green-500'} />}
                            value={s.plagiarismScore != null ? `${s.plagiarismScore}%` : '—'}
                            sub="Plag"
                            warn={plagHigh}
                        />
                        {s.grade != null && (
                            <MetricBadge
                                icon={<Award size={12} className="text-green-500" />}
                                value={`${s.grade}%`}
                                sub="Grade"
                            />
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => onView(s.id)}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                            title="View"
                        >
                            <Eye size={14} className="text-gray-600" />
                        </button>
                        {s.status !== 'GRADED' && (
                            <button
                                onClick={() => onGrade(s.id)}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                                title="Grade"
                            >
                                <Edit size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricBadge({ icon, value, sub, warn }: { icon: React.ReactNode; value: string; sub: string; warn?: boolean }) {
    return (
        <div className={`text-center px-2 py-1 rounded border text-xs ${warn ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-center gap-1 mb-0.5">{icon}<span className="font-bold text-gray-800">{value}</span></div>
            <div className="text-gray-400">{sub}</div>
        </div>
    );
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function LecturerAllSubmissionsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [sortBy, setSortBy] = useState<SortKey>('date');
    const { data: submissions, loading, error, refetch } = useAllSubmissions();

    const processed = useMemo(() => {
        const list = submissions ?? [];
        const filtered = list.filter((s) => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q || (s.studentName ?? '').toLowerCase().includes(q) || (s.assignmentTitle ?? '').toLowerCase().includes(q) || (s.moduleName ?? s.moduleCode ?? '').toLowerCase().includes(q);
            const matchesStatus =
                filterStatus === 'all' ? true
                : filterStatus === 'NEEDS_GRADING' ? ['SUBMITTED', 'PENDING_REVIEW', 'FLAGGED'].includes(s.status)
                : s.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'date': return new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime();
                case 'plagiarism': return (b.plagiarismScore ?? 0) - (a.plagiarismScore ?? 0);
                case 'ai': return (b.aiScore ?? 0) - (a.aiScore ?? 0);
                case 'priority': {
                    const ord: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
                    return ord[getPriority(a)] - ord[getPriority(b)];
                }
                default: return 0;
            }
        });
    }, [submissions, searchQuery, filterStatus, sortBy]);

    const stats = useMemo(() => {
        const list = submissions ?? [];
        return {
            total: list.length,
            pending: list.filter((s) => s.status === 'PENDING_REVIEW' || s.status === 'SUBMITTED').length,
            graded: list.filter((s) => s.status === 'GRADED').length,
            flagged: list.filter((s) => s.status === 'FLAGGED').length,
            late: list.filter((s) => s.status === 'LATE').length,
        };
    }, [submissions]);

    return (
        <div>
            <PageHeader title="All Submissions" subtitle="Review and grade student submissions" icon={FileText} iconColor="text-blue-600" loading={loading} onRefresh={refetch} />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                {loading ? (
                    [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)
                ) : (
                    <>
                        <StatCard label="Total" value={stats.total} gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
                        <StatCard label="Needs Grading" value={stats.pending} bgClass="bg-amber-50 border-amber-200" textClass="text-amber-700" onClick={() => { setFilterStatus('NEEDS_GRADING'); setSortBy('priority'); }} active={filterStatus === 'NEEDS_GRADING'} />
                        <StatCard label="Graded" value={stats.graded} bgClass="bg-green-50 border-green-200" textClass="text-green-700" onClick={() => setFilterStatus(filterStatus === 'GRADED' ? 'all' : 'GRADED')} active={filterStatus === 'GRADED'} />
                        <StatCard label="Flagged" value={stats.flagged} bgClass="bg-red-50 border-red-200" textClass="text-red-700" onClick={() => setFilterStatus(filterStatus === 'FLAGGED' ? 'all' : 'FLAGGED')} active={filterStatus === 'FLAGGED'} />
                        <StatCard label="Late" value={stats.late} bgClass="bg-purple-50 border-purple-200" textClass="text-purple-700" onClick={() => setFilterStatus(filterStatus === 'LATE' ? 'all' : 'LATE')} active={filterStatus === 'LATE'} />
                    </>
                )}
            </div>

            {error && <ErrorBanner message={`Could not load live data: ${error}`} />}

            {/* Filters */}
            <FilterToolbar>
                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by student, assignment, or module…" />
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as FilterStatus)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Status</option>
                        <option value="NEEDS_GRADING">Needs Grading</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="PENDING_REVIEW">Pending Review</option>
                        <option value="GRADED">Graded</option>
                        <option value="FLAGGED">Flagged</option>
                        <option value="LATE">Late</option>
                        <option value="DRAFT">Draft</option>
                    </select>
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="date">Sort: Date</option>
                    <option value="priority">Sort: Priority</option>
                    <option value="plagiarism">Sort: Plagiarism</option>
                    <option value="ai">Sort: AI Score</option>
                </select>
            </FilterToolbar>

            {/* List */}
            <div className="space-y-2">
                {loading && !submissions ? (
                    [1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)
                ) : processed.length > 0 ? (
                    processed.map((submission) => (
                        <SubmissionRow
                            key={submission.id}
                            submission={submission}
                            showPriority={sortBy === 'priority' || filterStatus === 'NEEDS_GRADING'}
                            onView={(id) => router.push(`/submissions/lecturer/submissions/${id}`)}
                            onGrade={(id) => router.push(`/submissions/lecturer/grading/${id}`)}
                        />
                    ))
                ) : (
                    <EmptyState
                        icon={FileText}
                        message={submissions?.length === 0 ? 'No submissions yet' : 'No submissions match your filters'}
                        onClear={searchQuery || filterStatus !== 'all' ? () => { setSearchQuery(''); setFilterStatus('all'); setSortBy('date'); } : undefined}
                    />
                )}
            </div>

            {!loading && processed.length > 0 && (
                <p className="text-xs text-gray-400 text-right mt-2">
                    Showing {processed.length} of {(submissions ?? []).length}
                </p>
            )}
        </div>
    );
}
