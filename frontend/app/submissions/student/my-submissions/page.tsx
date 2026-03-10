'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar, FileText, GitBranch, Shield, AlertCircle,
    RefreshCw, Clock, ChevronRight, X, Download,
} from 'lucide-react';
import { useAssignments, useSubmissions } from '@/hooks/useSubmissions';
import { useVersions } from '@/hooks/useVersions';
import { useSelectedCourse } from '@/hooks/useSelectedCourse';
import { versionService } from '@/lib/api/submission-services';
import { downloadSubmissionPdf } from '@/lib/generate-submission-pdf';
import type { Assignment, Submission } from '@/types/submission.types';

// ─── Constants ──────────────────────────────────────────────────────────────

const NOW = Date.now();

// ─── Item types ─────────────────────────────────────────────────────────────

/**
 * Derived status for each assignment card.
 *   not_started → student hasn't touched this yet, deadline still open
 *   draft       → student has an auto-saved draft in progress
 *   submitted   → at least one SUBMITTED submission exists
 *   graded      → submission has been graded
 *   overdue     → deadline passed, no terminal submission
 */
type ItemStatus = 'not_started' | 'draft' | 'submitted' | 'graded' | 'overdue';
type FilterKey  = 'all' | ItemStatus;

interface AssignmentItem {
    assignmentId: string;
    title:        string;
    moduleCode:   string;
    moduleName?:  string;
    dueDate?:     string;
    assignmentType?: 'project' | 'task';
    /** Most recent terminal (non-draft) submission — used for score display + links */
    submission?: Submission;
    /** True when a DRAFT submission exists (student is actively editing) */
    hasDraft: boolean;
    status:   ItemStatus;
    isOverdue: boolean;
    dueMs:    number; // epoch ms for sorting
}

// ─── Status visual config ────────────────────────────────────────────────────

const STATUS_CFG: Record<ItemStatus, {
    label: string; dotColor: string; textColor: string;
    bgColor: string; borderColor: string;
}> = {
    not_started: { label: 'Not Started',  dotColor: 'bg-gray-400',    textColor: 'text-gray-600',   bgColor: 'bg-gray-100',    borderColor: 'border-gray-200'  },
    draft:       { label: 'In Progress',  dotColor: 'bg-amber-400',   textColor: 'text-amber-700',  bgColor: 'bg-amber-100',   borderColor: 'border-amber-200' },
    submitted:   { label: 'Submitted',    dotColor: 'bg-green-500',   textColor: 'text-green-700',  bgColor: 'bg-green-100',   borderColor: 'border-green-200' },
    graded:      { label: 'Graded',       dotColor: 'bg-blue-500',    textColor: 'text-blue-700',   bgColor: 'bg-blue-100',    borderColor: 'border-blue-200'  },
    overdue:     { label: 'Overdue',      dotColor: 'bg-red-500',     textColor: 'text-red-700',    bgColor: 'bg-red-100',     borderColor: 'border-red-200'   },
};

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',         label: 'All'          },
    { key: 'not_started', label: 'Not Started'  },
    { key: 'draft',       label: 'In Progress'  },
    { key: 'submitted',   label: 'Submitted'    },
    { key: 'graded',      label: 'Graded'       },
    { key: 'overdue',     label: 'Overdue'      },
];

// Sort priority: actively-working first, then pending, then completed, overdue last
const STATUS_ORDER: Record<ItemStatus, number> = {
    draft:       0,
    not_started: 1,
    submitted:   2,
    graded:      3,
    overdue:     4,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStudentId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId ?? payload.sub ?? null;
    } catch { return null; }
}

function deriveStatus(
    terminalSub: Submission | undefined,
    hasDraft: boolean,
    isOverdue: boolean,
): ItemStatus {
    if (!terminalSub) {
        if (hasDraft)   return 'draft';
        if (isOverdue)  return 'overdue';
        return 'not_started';
    }
    if (terminalSub.status === 'GRADED')                          return 'graded';
    if (['SUBMITTED', 'PENDING_REVIEW', 'FLAGGED', 'LATE']
            .includes(terminalSub.status))                        return 'submitted';
    // DRAFT terminal — shouldn't happen but handle gracefully
    if (hasDraft || !isOverdue) return 'draft';
    return 'overdue';
}

function formatDue(iso: string): { label: string; color: string } {
    const diff = new Date(iso).getTime() - NOW;
    const days = Math.floor(Math.abs(diff) / 86_400_000);
    if (diff < 0) {
        const s = days === 0 ? 'today (overdue)' : `${days}d overdue`;
        return { label: s, color: 'text-red-600' };
    }
    if (days === 0) return { label: 'Due today!', color: 'text-amber-600' };
    if (days <= 3)  return { label: `${days} day${days !== 1 ? 's' : ''} left`, color: 'text-amber-600' };
    return { label: `${days} days left`, color: 'text-gray-500' };
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function CardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="flex gap-4">
                <div className="h-11 w-11 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2.5 min-w-0">
                    <div className="flex gap-2 flex-wrap">
                        <div className="h-5 bg-gray-200 rounded w-52" />
                        <div className="h-5 bg-gray-100 rounded w-16" />
                        <div className="h-5 bg-gray-100 rounded w-20" />
                    </div>
                    <div className="h-3.5 bg-gray-100 rounded w-40" />
                    <div className="h-3.5 bg-gray-100 rounded w-28" />
                </div>
                <div className="shrink-0 flex flex-col gap-2 items-end">
                    <div className="h-8 w-32 bg-gray-200 rounded-lg" />
                    <div className="h-6 w-40 bg-gray-100 rounded" />
                </div>
            </div>
        </div>
    );
}

// ─── Version Count Badge ──────────────────────────────────────────────────────

function VersionCountBadge({ submissionId }: { submissionId: string }) {
    const { data: versions, loading } = useVersions(submissionId);
    const count = versions?.length ?? 0;
    if (loading) return <span className="text-gray-300 text-xs">…</span>;
    if (count === 0) return null;
    return (
        <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold leading-none">
            {count}
        </span>
    );
}

// ─── Assignment Card ──────────────────────────────────────────────────────────

function AssignmentCard({
    item,
    router,
}: {
    item: AssignmentItem;
    router: ReturnType<typeof useRouter>;
}) {
    const [downloading, setDownloading] = useState(false);
    const cfg  = STATUS_CFG[item.status];
    const sub  = item.submission;
    const due  = item.dueDate ? formatDue(item.dueDate) : null;

    async function handleDownloadPdf() {
        if (!sub?.id || downloading) return;
        setDownloading(true);
        try {
            const version = await versionService.getLatestVersion(sub.id);
            downloadSubmissionPdf(
                version,
                item.title,
                item.moduleName ?? item.moduleCode,
                sub.studentName,
            );
        } catch (err) {
            console.error('[MySubmissions] PDF download failed:', err);
            alert('Failed to download PDF. Please try again.');
        } finally {
            setDownloading(false);
        }
    }

    // Score chips — shown when there is a submitted/graded submission
    const hasScores = sub && (
        sub.grade != null || sub.plagiarismScore != null ||
        sub.aiScore != null || (sub.wordCount != null && sub.wordCount > 0)
    );

    // Card border colour depends on status
    const cardBorder =
        item.status === 'overdue'  ? 'border-red-200   bg-red-50/30'     :
        item.status === 'draft'    ? 'border-amber-200 bg-amber-50/20'   :
        item.status === 'graded'   ? 'border-blue-200  bg-blue-50/10'    :
        item.status === 'submitted'? 'border-green-200 bg-green-50/10'   :
                                     'border-gray-200  bg-white';

    return (
        <div className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${cardBorder}`}>
            <div className="flex flex-wrap gap-4">

                {/* ── Icon ─────────────────────────────────────── */}
                <div className={`h-11 w-11 shrink-0 rounded-lg flex items-center justify-center ${cfg.bgColor}`}>
                    <Calendar size={20} className={cfg.textColor} />
                </div>

                {/* ── Info ─────────────────────────────────────── */}
                <div className="flex-1 min-w-0">

                    {/* Title + type + status badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">
                            {item.title}
                        </h3>
                        {item.assignmentType === 'project' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                Project
                            </span>
                        )}
                        {item.assignmentType === 'task' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                                Task
                            </span>
                        )}
                        {/* Status badge */}
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.textColor}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                            {cfg.label}
                        </span>
                        {/* Extra "editing" indicator when student opened a draft on top of a submitted one */}
                        {item.hasDraft && item.status === 'submitted' && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                Edit draft open
                            </span>
                        )}
                    </div>

                    {/* Module */}
                    <p className="text-xs text-gray-500 mb-1">
                        {item.moduleName ?? item.moduleCode}
                    </p>

                    {/* Due date */}
                    {due && item.dueDate && (
                        <div className="flex items-center gap-1.5 text-xs mb-2">
                            <Clock size={11} className={due.color} />
                            <span className="text-gray-400">
                                {new Date(item.dueDate).toLocaleDateString('en-US', {
                                    day: 'numeric', month: 'short', year: 'numeric',
                                })}
                            </span>
                            <span className={`font-semibold ${due.color}`}>· {due.label}</span>
                        </div>
                    )}

                    {/* Score chips (submitted / graded) */}
                    {hasScores && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {sub!.grade != null && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                                    Grade: {sub!.grade}%
                                </span>
                            )}
                            {sub!.plagiarismScore != null && (
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                                    sub!.plagiarismScore < 10 ? 'bg-green-100 text-green-700' :
                                    sub!.plagiarismScore < 30 ? 'bg-amber-100 text-amber-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    <Shield size={10} />
                                    Plagiarism {sub!.plagiarismScore}%
                                </span>
                            )}
                            {sub!.aiScore != null && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                                    AI Score {sub!.aiScore}
                                </span>
                            )}
                            {sub!.wordCount != null && sub!.wordCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                    <FileText size={10} />
                                    {sub!.wordCount.toLocaleString()} words
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Actions ──────────────────────────────────── */}
                <div className="flex flex-col items-end gap-2 shrink-0 justify-center">

                    {/* Primary action button */}
                    {item.status === 'overdue' && !sub && !item.hasDraft ? (
                        <span className="text-xs text-red-500 font-medium px-3 py-1.5 rounded-lg bg-red-100">
                            Deadline passed
                        </span>
                    ) : item.status === 'not_started' ? (
                        <button
                            onClick={() => router.push(`/submissions/student/answer/${item.assignmentId}${item.assignmentType ? `?type=${item.assignmentType}` : ''}`)}
                            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors cursor-pointer shadow-sm"
                        >
                            Start Answering <ChevronRight size={14} />
                        </button>
                    ) : item.status === 'draft' ? (
                        <button
                            onClick={() => router.push(`/submissions/student/answer/${item.assignmentId}${item.assignmentType ? `?type=${item.assignmentType}` : ''}`)}
                            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer shadow-sm"
                        >
                            Continue Writing <ChevronRight size={14} />
                        </button>
                    ) : item.status === 'submitted' && !item.isOverdue ? (
                        <button
                            onClick={() => router.push(`/submissions/student/answer/${item.assignmentId}${item.assignmentType ? `?type=${item.assignmentType}` : ''}`)}
                            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors cursor-pointer shadow-sm"
                        >
                            Edit / Resubmit <ChevronRight size={14} />
                        </button>
                    ) : (
                        /* Graded, overdue-submitted, or late — read-only view */
                        <button
                            onClick={() => sub && router.push(`/submissions/student/feedback/${sub.id}`)}
                            disabled={!sub}
                            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            View Answers <ChevronRight size={14} />
                        </button>
                    )}

                    {/* Secondary: Versions + Download PDF (only when a terminal submission exists) */}
                    {sub && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push(`/submissions/student/version-history/${sub.id}`)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Version history & compare"
                            >
                                <GitBranch size={12} />
                                Versions
                                <VersionCountBadge submissionId={sub.id} />
                            </button>
                            <button
                                onClick={handleDownloadPdf}
                                disabled={downloading}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50"
                                title="Download questions & answers as PDF"
                            >
                                <Download size={12} className={downloading ? 'animate-bounce' : ''} />
                                {downloading ? 'Downloading…' : 'Download PDF'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MySubmissionsPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<FilterKey>('all');

    const [studentId] = useState<string | null>(getStudentId);

    // Data sources
    const { data: submissions, loading: subLoading, error: subError, refetch } =
        useSubmissions(studentId);
    // Fetches ALL student assignments (projects + tasks) from P&T service — no status filter
    const { data: assignments, loading: asgLoading, error: asgError } = useAssignments();
    const selectedCourse = useSelectedCourse('student');

    const loading = subLoading || asgLoading;

    // ── Build per-assignment submission maps ──────────────────
    const { terminalSubMap, draftSubMap } = useMemo(() => {
        const termMap  = new Map<string, Submission>(); // most recent non-draft
        const draftMap = new Map<string, Submission>(); // most recent draft

        for (const s of Array.isArray(submissions) ? submissions : []) {
            if (s.status === 'DRAFT') {
                const ex = draftMap.get(s.assignmentId);
                if (!ex || new Date(s.createdAt) > new Date(ex.createdAt)) {
                    draftMap.set(s.assignmentId, s);
                }
            } else {
                const ex = termMap.get(s.assignmentId);
                if (!ex || new Date(s.createdAt) > new Date(ex.createdAt)) {
                    termMap.set(s.assignmentId, s);
                }
            }
        }
        return { terminalSubMap: termMap, draftSubMap: draftMap };
    }, [submissions]);

    // ── Merge assignments + orphan submissions ────────────────
    const allItems = useMemo<AssignmentItem[]>(() => {
        const seen   = new Set<string>();
        const result: AssignmentItem[] = [];

        // From assignment list
        for (const asg of Array.isArray(assignments) ? assignments as Assignment[] : []) {
            seen.add(asg.id);
            const dueMs    = asg.dueDate ? new Date(asg.dueDate).getTime() : Infinity;
            const isOverdue = dueMs < NOW;
            const sub      = terminalSubMap.get(asg.id);
            const hasDraft = draftSubMap.has(asg.id);
            result.push({
                assignmentId:   asg.id,
                title:          asg.title,
                moduleCode:     asg.moduleCode,
                moduleName:     asg.moduleName,
                dueDate:        asg.dueDate,
                assignmentType: asg.assignmentType,
                submission:     sub,
                hasDraft,
                status:         deriveStatus(sub, hasDraft, isOverdue),
                isOverdue,
                dueMs,
            });
        }

        // Submissions whose assignment isn't in the list (closed/archived assignments)
        for (const s of Array.isArray(submissions) ? submissions : []) {
            if (!seen.has(s.assignmentId)) {
                seen.add(s.assignmentId);
                const dueMs     = s.dueDate ? new Date(s.dueDate).getTime() : Infinity;
                const isOverdue  = dueMs < NOW;
                const sub        = terminalSubMap.get(s.assignmentId);
                const hasDraft   = draftSubMap.has(s.assignmentId);
                result.push({
                    assignmentId:   s.assignmentId,
                    title:          s.assignmentTitle ?? 'Assignment',
                    moduleCode:     s.moduleCode ?? '',
                    moduleName:     s.moduleName,
                    dueDate:        s.dueDate,
                    assignmentType: undefined,
                    submission:     sub,
                    hasDraft,
                    status:         deriveStatus(sub, hasDraft, isOverdue),
                    isOverdue,
                    dueMs,
                });
            }
        }

        return result;
    }, [assignments, submissions, terminalSubMap, draftSubMap]);

    // ── Sort ─────────────────────────────────────────────────
    const sorted = useMemo(() =>
        [...allItems].sort((a, b) => {
            const od = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
            if (od !== 0) return od;
            return a.dueMs - b.dueMs; // soonest deadline first within same group
        }),
    [allItems]);

    // ── Course filter ─────────────────────────────────────────
    const courseFiltered = useMemo(() => {
        if (!selectedCourse) return sorted;
        const result = sorted.filter(item =>
            item.moduleName === selectedCourse.name ||
            item.moduleCode === selectedCourse.id   ||
            item.moduleCode === selectedCourse.courseCode ||
            // also match by courseId stored as moduleCode when course enrichment is absent
            item.moduleCode?.toLowerCase() === selectedCourse.courseCode?.toLowerCase() ||
            item.moduleName?.toLowerCase() === selectedCourse.name?.toLowerCase()
        );
        if (result.length === 0 && sorted.length > 0) {
            console.warn('[MySubmissions] Course filter matched 0 of', sorted.length, 'items.',
                'selectedCourse:', selectedCourse,
                'item samples:', sorted.slice(0, 3).map(i => ({ moduleCode: i.moduleCode, moduleName: i.moduleName }))
            );
        }
        return result;
    }, [sorted, selectedCourse]);

    // ── Status filter ─────────────────────────────────────────
    const filtered = useMemo(() =>
        filter === 'all'
            ? courseFiltered
            : courseFiltered.filter(i => i.status === filter),
    [courseFiltered, filter]);

    // ── Stats (based on course-filtered items so counts match what's visible) ──
    const counts = useMemo(() => ({
        total:       courseFiltered.length,
        draft:       courseFiltered.filter(i => i.status === 'draft').length,
        not_started: courseFiltered.filter(i => i.status === 'not_started').length,
        submitted:   courseFiltered.filter(i => i.status === 'submitted').length,
        graded:      courseFiltered.filter(i => i.status === 'graded').length,
        overdue:     courseFiltered.filter(i => i.status === 'overdue').length,
    }), [courseFiltered]);

    // ─────────────────────────────────────────────────────────
    return (
        <div>
            {/* ── Header ───────────────────────────────────── */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">My Assignments</h1>
                    <p className="text-sm text-gray-500">
                        All assignments from your enrolled modules — sorted by priority
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* ── Stats strip ──────────────────────────────── */}
            {!loading && counts.total > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                    {[
                        { label: 'Total',       value: counts.total,       cls: 'text-gray-700   bg-white       border-gray-200'   },
                        { label: 'In Progress', value: counts.draft,       cls: 'text-amber-700  bg-amber-50    border-amber-200'  },
                        { label: 'Submitted',   value: counts.submitted,   cls: 'text-green-700  bg-green-50    border-green-200'  },
                        { label: 'Graded',      value: counts.graded,      cls: 'text-blue-700   bg-blue-50     border-blue-200'   },
                        { label: 'Not Started', value: counts.not_started, cls: 'text-gray-600   bg-gray-50     border-gray-200'   },
                        { label: 'Overdue',     value: counts.overdue,     cls: 'text-red-700    bg-red-50      border-red-200'    },
                    ].filter(s => s.value > 0).map(s => (
                        <div key={s.label} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${s.cls}`}>
                            <span className="font-bold text-base">{s.value}</span>
                            <span className="text-xs opacity-70">{s.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Filter tabs ──────────────────────────────── */}
            <div className="flex flex-wrap gap-2 mb-5">
                {FILTERS.map(f => {
                    const count = f.key === 'all'
                        ? counts.total
                        : counts[f.key as keyof typeof counts];
                    return (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                                filter === f.key
                                    ? 'bg-purple-600 text-white border-transparent shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-purple-300 hover:text-purple-700'
                            }`}
                        >
                            {f.label}
                            <span className="ml-1.5 opacity-60">({count})</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Error banners ─────────────────────────────── */}
            {asgError && (
                <div className="flex items-start gap-3 p-4 mb-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Could not load assignments</p>
                        <p className="text-xs text-red-700 mt-0.5">{asgError}</p>
                        <p className="text-xs text-red-500 mt-1">Check the browser console (F12 → Console) for details.</p>
                    </div>
                </div>
            )}
            {subError && (
                <div className="flex items-start gap-3 p-4 mb-5 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">Could not load your submissions</p>
                        <p className="text-xs text-amber-700 mt-0.5">{subError}</p>
                    </div>
                </div>
            )}

            {/* ── Course filter notice ─────────────────────── */}
            {selectedCourse && allItems.length > 0 && courseFiltered.length === 0 && !loading && (
                <div className="flex items-center justify-between gap-3 p-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                        <AlertCircle size={16} className="text-blue-500 shrink-0" />
                        <span>
                            No assignments found for <strong>{selectedCourse.name}</strong>.
                            Your {allItems.length} assignment{allItems.length !== 1 ? 's' : ''} belong to a different course.
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('selectedStudentCourse');
                            window.dispatchEvent(new CustomEvent('studentCourseSelected', { detail: null }));
                            window.location.reload();
                        }}
                        className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-semibold whitespace-nowrap cursor-pointer"
                    >
                        <X size={12} /> Clear filter
                    </button>
                </div>
            )}

            {/* ── Content ──────────────────────────────────── */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
                </div>
            ) : filtered.length > 0 ? (
                <div className="space-y-3">
                    {filtered.map(item => (
                        <AssignmentCard key={item.assignmentId} item={item} router={router} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">
                        {filter === 'all'
                            ? 'No assignments found'
                            : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} assignments`}
                    </p>
                    {filter !== 'all' && (
                        <button
                            onClick={() => setFilter('all')}
                            className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium cursor-pointer"
                        >
                            Show all assignments
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
