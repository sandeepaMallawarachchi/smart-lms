'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
    CheckSquare,
    Square,
    Sparkles,
    X,
    Loader2,
    Download,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useAllSubmissions } from '@/hooks/useSubmissions';
import { submissionService } from '@/lib/api/submission-services';
import { csvRow, buildCsv, downloadCsvBlob } from '@/lib/csv';
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

// ─── Bulk Grade Panel ─────────────────────────────────────────

interface BulkGradeResult { succeeded: number; failed: number; }

function BulkGradePanel({
    selected,
    submissions,
    onClear,
    onDone,
}: {
    selected: Set<string>;
    submissions: Submission[];
    onClear: () => void;
    onDone: () => void;
}) {
    const [mode, setMode] = useState<'ai' | 'fixed'>('ai');
    const [fixedGrade, setFixedGrade] = useState('');
    const [feedback, setFeedback] = useState('');
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [result, setResult] = useState<BulkGradeResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const selectedList = useMemo(
        () => submissions.filter((s) => selected.has(s.id)),
        [submissions, selected],
    );

    function getLecturerId() {
        try {
            const token = localStorage.getItem('authToken') ?? '';
            const payload = JSON.parse(atob(token.split('.')[1]));
            return String(payload.userId ?? payload.sub ?? 'unknown');
        } catch { return 'unknown'; }
    }

    const handleApply = useCallback(async () => {
        setError(null);
        setResult(null);
        const total = selectedList.length;
        setProgress({ done: 0, total });
        let succeeded = 0, failed = 0;
        const lecturerId = getLecturerId();

        for (const s of selectedList) {
            try {
                const grade = mode === 'ai'
                    ? (s.aiScore ?? 0)
                    : parseFloat(fixedGrade);
                await submissionService.gradeSubmission(s.id, {
                    grade,
                    lecturerFeedback: feedback.trim() || `Graded via bulk action.`,
                    lecturerId,
                });
                succeeded++;
            } catch {
                failed++;
            }
            setProgress((p) => p ? { ...p, done: p.done + 1 } : null);
        }

        setProgress(null);
        setResult({ succeeded, failed });
        if (failed === 0) {
            setTimeout(() => { onClear(); onDone(); }, 1200);
        }
    }, [selectedList, mode, fixedGrade, feedback, onClear, onDone]);

    const isFixed = mode === 'fixed';
    const fixedVal = parseFloat(fixedGrade);
    const canApply = progress === null && (
        mode === 'ai' || (!isNaN(fixedVal) && fixedVal >= 0 && fixedVal <= 100)
    );

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-blue-200 bg-blue-50 shadow-lg">
            <div className="mx-auto max-w-5xl px-4 py-3">
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-800">
                        {selected.size} submission{selected.size !== 1 ? 's' : ''} selected
                    </span>
                    <button onClick={onClear} className="text-blue-500 hover:text-blue-700 cursor-pointer">
                        <X size={16} />
                    </button>
                </div>

                {result ? (
                    <div className={`flex items-center gap-2 text-sm font-medium ${result.failed === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                        <CheckCircle2 size={14} />
                        {result.succeeded} graded{result.failed > 0 ? `, ${result.failed} failed` : ' successfully'}.
                        {result.failed > 0 && (
                            <button onClick={() => setResult(null)} className="ml-2 underline text-xs cursor-pointer">Retry failed</button>
                        )}
                    </div>
                ) : progress ? (
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                        <Loader2 size={14} className="animate-spin" />
                        Grading {progress.done} / {progress.total}…
                    </div>
                ) : (
                    <div className="flex flex-wrap items-end gap-3">
                        {/* Mode toggle */}
                        <div className="flex rounded-lg border border-blue-200 overflow-hidden text-xs font-medium">
                            <button
                                onClick={() => setMode('ai')}
                                className={`px-3 py-1.5 cursor-pointer transition-colors ${mode === 'ai' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
                            >
                                <span className="flex items-center gap-1"><Sparkles size={11} /> Apply AI grade</span>
                            </button>
                            <button
                                onClick={() => setMode('fixed')}
                                className={`px-3 py-1.5 cursor-pointer transition-colors ${mode === 'fixed' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
                            >
                                Fixed grade
                            </button>
                        </div>

                        {/* Fixed grade input */}
                        {isFixed && (
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.5}
                                    value={fixedGrade}
                                    onChange={(e) => setFixedGrade(e.target.value)}
                                    placeholder="0–100"
                                    className="w-20 px-2 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-xs text-blue-600">%</span>
                            </div>
                        )}

                        {/* Feedback */}
                        <input
                            type="text"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Bulk feedback (optional)…"
                            className="flex-1 min-w-[180px] px-2 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        {/* Apply */}
                        <button
                            onClick={handleApply}
                            disabled={!canApply}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                        >
                            Apply to {selected.size}
                        </button>
                    </div>
                )}

                {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>
        </div>
    );
}

// ─── Submission Row ───────────────────────────────────────────

function SubmissionRow({
    submission: s,
    onView,
    onGrade,
    showPriority,
    selected,
    onToggle,
}: {
    submission: Submission;
    onView: (id: string) => void;
    onGrade: (id: string) => void;
    showPriority?: boolean;
    selected?: boolean;
    onToggle?: (id: string) => void;
}) {
    const plagHigh = (s.plagiarismScore ?? 0) >= 20;
    const priority = getPriority(s);

    return (
        <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-all ${selected ? 'ring-2 ring-blue-400 border-blue-300' : s.isLate ? 'border-l-4 border-l-purple-400 border-gray-200' : plagHigh ? 'border-l-4 border-l-red-400 border-gray-200' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between gap-3">
                {/* Selection checkbox */}
                {onToggle && (
                    <button
                        onClick={() => onToggle(s.id)}
                        className="shrink-0 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                        aria-label={selected ? 'Deselect' : 'Select'}
                    >
                        {selected
                            ? <CheckSquare size={16} className="text-blue-600" />
                            : <Square size={16} />
                        }
                    </button>
                )}

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

/* ─── Pagination Bar ──────────────────────────────────────── */

const PAGE_SIZE = 15;

function PaginationBar({
    page,
    totalPages,
    totalElements,
    pageSize,
    onPage,
}: {
    page: number;
    totalPages: number;
    totalElements: number;
    pageSize: number;
    onPage: (p: number) => void;
}) {
    if (totalPages <= 1) return null;
    const from = page * pageSize + 1;
    const to   = Math.min((page + 1) * pageSize, totalElements);

    const pages: (number | '…')[] = [];
    if (totalPages <= 7) {
        for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
        pages.push(0);
        if (page > 2)        pages.push('…');
        for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
        if (page < totalPages - 3) pages.push('…');
        pages.push(totalPages - 1);
    }

    return (
        <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-xs text-gray-500">
                {from}–{to} of {totalElements} submissions
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPage(page - 1)}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                    p === '…' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-xs select-none">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPage(p as number)}
                            className={`min-w-[28px] h-7 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                p === page
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {(p as number) + 1}
                        </button>
                    )
                )}
                <button
                    onClick={() => onPage(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function LecturerAllSubmissionsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [sortBy, setSortBy] = useState<SortKey>('date');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(0);

    // Reset to page 0 when filters change
    useEffect(() => { setPage(0); }, [searchQuery, filterStatus, sortBy]);

    const { data: submissions, loading, error, refetch, totalPages, totalElements } = useAllSubmissions({
        page,
        pageSize: PAGE_SIZE,
    });

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    const selectAllVisible = useCallback((list: Submission[]) => {
        setSelectedIds(new Set(list.map((s) => s.id)));
    }, []);

    const handleExport = useCallback((list: Submission[]) => {
        const header = csvRow(
            'Student Name', 'Student ID', 'Assignment', 'Module', 'Status',
            'Submitted At', 'AI Score (%)', 'Plagiarism (%)', 'Grade',
            'Word Count', 'Versions', 'Late',
        );
        const rows = list.map((s) => csvRow(
            s.studentName ?? '',
            s.studentId ?? '',
            s.assignmentTitle ?? '',
            s.moduleName ?? s.moduleCode ?? '',
            s.status,
            s.submittedAt ? new Date(s.submittedAt).toISOString() : '',
            s.aiScore != null ? s.aiScore : '',
            s.plagiarismScore != null ? s.plagiarismScore : '',
            s.grade != null ? s.grade : '',
            s.wordCount != null ? s.wordCount : '',
            s.currentVersionNumber ?? '',
            s.isLate ? 'Yes' : 'No',
        ));
        const filename = `submissions_export_${new Date().toISOString().slice(0, 10)}.csv`;
        downloadCsvBlob(buildCsv([header, ...rows]), filename);
    }, []);

    const processed = useMemo(() => {
        const list = submissions ?? [];
        const filtered = list.filter((s) => {
            // Hide drafts unless the lecturer explicitly filters for them
            if (s.status === 'DRAFT' && filterStatus !== 'DRAFT') return false;
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
        const list = (submissions ?? []).filter((s) => s.status !== 'DRAFT');
        return {
            // Use server-reported total when paginating; fall back to page-local count
            total: totalElements > 0 ? totalElements : list.length,
            pending: list.filter((s) => s.status === 'PENDING_REVIEW' || s.status === 'SUBMITTED').length,
            graded: list.filter((s) => s.status === 'GRADED').length,
            flagged: list.filter((s) => s.status === 'FLAGGED').length,
            late: list.filter((s) => s.status === 'LATE').length,
        };
    }, [submissions, totalElements]);

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

                {/* Select-all toggle — only visible when there are rows */}
                {processed.length > 0 && (
                    <button
                        onClick={() =>
                            selectedIds.size === processed.length
                                ? clearSelection()
                                : selectAllVisible(processed)
                        }
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                        title={selectedIds.size === processed.length ? 'Deselect all' : 'Select all visible'}
                    >
                        {selectedIds.size === processed.length && processed.length > 0
                            ? <CheckSquare size={14} className="text-blue-600" />
                            : <Square size={14} />
                        }
                        {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                    </button>
                )}

                {/* Export CSV — exports the current filtered+sorted list */}
                {processed.length > 0 && (
                    <button
                        onClick={() => handleExport(processed)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                        title={`Export ${processed.length} row${processed.length !== 1 ? 's' : ''} to CSV`}
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                )}
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
                            selected={selectedIds.has(submission.id)}
                            onToggle={toggleSelect}
                        />
                    ))
                ) : (
                    <EmptyState
                        icon={FileText}
                        message={submissions?.length === 0 ? 'No submissions yet' : 'No submissions match your filters'}
                        onClear={searchQuery || filterStatus !== 'all' ? () => { setSearchQuery(''); setFilterStatus('all'); setSortBy('date'); clearSelection(); } : undefined}
                    />
                )}
            </div>

            {!loading && totalPages > 1 && (
                <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    pageSize={PAGE_SIZE}
                    onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
            )}
            {!loading && totalPages <= 1 && processed.length > 0 && (
                <p className="text-xs text-gray-400 text-right mt-2">
                    Showing {processed.length} submission{processed.length !== 1 ? 's' : ''}
                </p>
            )}

            {/* Bulk grade panel — slides up when at least one row is selected */}
            {selectedIds.size > 0 && (
                <BulkGradePanel
                    selected={selectedIds}
                    submissions={processed}
                    onClear={clearSelection}
                    onDone={refetch}
                />
            )}
        </div>
    );
}
