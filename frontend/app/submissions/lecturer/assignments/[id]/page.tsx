'use client';

import React, { use, useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    Eye,
    FileText,
    Users,
} from 'lucide-react';
import { submissionService } from '@/lib/api/submission-services';
import { useAllSubmissions } from '@/hooks/useSubmissions';
import {
    PageHeader,
    Skeleton,
    ErrorBanner,
    SectionCard,
    StatCard,
    EmptyState,
} from '@/components/submissions/lecturer/PageShell';
import type { Assignment } from '@/types/submission.types';

/* ─── Helpers ──────────────────────────────────────────────── */

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    OPEN:   { label: 'Open',   cls: 'bg-green-100 text-green-700' },
    CLOSED: { label: 'Closed', cls: 'bg-gray-100 text-gray-600' },
    DRAFT:  { label: 'Draft',  cls: 'bg-amber-100 text-amber-700' },
};

function formatDate(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssignment = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const a = await submissionService.getAssignment(id);
            setAssignment(a);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load assignment');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchAssignment(); }, [fetchAssignment]);

    const { data: submissions, loading: subsLoading } = useAllSubmissions({ assignmentId: id });

    const subsStats = useMemo(() => {
        const all = submissions ?? [];
        const graded = all.filter((s) => s.status === 'GRADED').length;
        const pending = all.filter((s) => s.status === 'PENDING_REVIEW' || s.status === 'SUBMITTED').length;
        const flagged = all.filter((s) => s.status === 'FLAGGED').length;
        return { total: all.length, graded, pending, flagged };
    }, [submissions]);

    const badge = STATUS_BADGE[assignment?.status ?? ''] ?? { label: assignment?.status ?? '', cls: 'bg-gray-100 text-gray-600' };

    const dueDate = assignment?.dueDate ? new Date(assignment.dueDate) : null;
    const isOverdue = assignment?.status === 'OPEN' && dueDate && dueDate.getTime() < Date.now();

    return (
        <div>
            <button
                onClick={() => router.push('/submissions/lecturer/assignments')}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm mb-4 transition-colors cursor-pointer"
            >
                <ArrowLeft size={16} /> Back to Assignments
            </button>

            <PageHeader
                title={assignment?.title ?? 'Assignment Detail'}
                subtitle={assignment ? `${assignment.moduleName ?? assignment.moduleCode}` : 'Loading…'}
                icon={FileText}
                iconColor="text-blue-600"
                loading={loading}
                onRefresh={fetchAssignment}
                actions={
                    assignment?.status === 'DRAFT' ? (
                        <button
                            onClick={() => router.push(`/submissions/lecturer/assignments/${id}/edit`)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium cursor-pointer"
                        >
                            <Edit size={14} /> Edit Draft
                        </button>
                    ) : undefined
                }
            />

            {error && <ErrorBanner message={error} onRetry={fetchAssignment} />}

            {loading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}
                    </div>
                    <Skeleton className="h-40" />
                </div>
            ) : assignment ? (
                <div className="space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="p-4 rounded-xl border border-gray-200 bg-white">
                            <div className="text-xs text-gray-500 mb-1">Status</div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                                {badge.label}
                            </span>
                            {isOverdue && (
                                <span className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                    Overdue
                                </span>
                            )}
                        </div>
                        <StatCard label="Total Marks" value={assignment.totalMarks} bgClass="bg-purple-50 border-purple-200" textClass="text-purple-700" />
                        <StatCard
                            label="Submissions"
                            value={subsLoading ? '…' : subsStats.total}
                            bgClass="bg-blue-50 border-blue-200"
                            textClass="text-blue-700"
                        />
                        <StatCard
                            label="Graded"
                            value={subsLoading ? '…' : subsStats.graded}
                            bgClass="bg-green-50 border-green-200"
                            textClass="text-green-700"
                        />
                        <StatCard
                            label="Pending"
                            value={subsLoading ? '…' : subsStats.pending}
                            bgClass={subsStats.pending > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}
                            textClass={subsStats.pending > 0 ? 'text-amber-700' : 'text-gray-500'}
                        />
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main info */}
                        <div className="lg:col-span-2 space-y-6">
                            <SectionCard title="Assignment Information" icon={FileText} iconColor="text-blue-600">
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <div>
                                        <dt className="text-gray-500">Module</dt>
                                        <dd className="font-medium text-gray-900 mt-0.5">
                                            {assignment.moduleName ?? assignment.moduleCode}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Type</dt>
                                        <dd className="font-medium text-gray-900 mt-0.5">
                                            {assignment.assignmentType ? (assignment.assignmentType === 'project' ? 'Project' : 'Task') : 'Standard'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Due Date</dt>
                                        <dd className={`font-medium mt-0.5 flex items-center gap-1.5 ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                            <Calendar size={14} className={isOverdue ? 'text-red-400' : 'text-gray-400'} />
                                            {formatDate(assignment.dueDate)}
                                            {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Overdue</span>}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Total Marks</dt>
                                        <dd className="font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                                            <Award size={14} className="text-purple-500" /> {assignment.totalMarks}
                                        </dd>
                                    </div>
                                    {assignment.maxFileSizeMB != null && (
                                        <div>
                                            <dt className="text-gray-500">Max File Size</dt>
                                            <dd className="font-medium text-gray-900 mt-0.5">{assignment.maxFileSizeMB} MB</dd>
                                        </div>
                                    )}
                                    {assignment.allowedFileTypes && assignment.allowedFileTypes.length > 0 && (
                                        <div>
                                            <dt className="text-gray-500">Allowed File Types</dt>
                                            <dd className="font-medium text-gray-900 mt-0.5">{assignment.allowedFileTypes.join(', ')}</dd>
                                        </div>
                                    )}
                                </dl>
                                {assignment.description && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Description</p>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
                                    </div>
                                )}
                            </SectionCard>

                            {/* Grading Progress */}
                            {subsStats.total > 0 && (
                                <SectionCard title="Grading Progress" icon={CheckCircle2} iconColor="text-green-600">
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>{subsStats.graded} of {subsStats.total} graded</span>
                                            <span className="font-medium">{Math.round((subsStats.graded / subsStats.total) * 100)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(subsStats.graded / subsStats.total) * 100}%` }} />
                                        </div>
                                        {subsStats.flagged > 0 && (
                                            <p className="text-xs text-red-600 font-medium">{subsStats.flagged} submission(s) flagged for review</p>
                                        )}
                                    </div>
                                </SectionCard>
                            )}
                        </div>

                        {/* Right sidebar */}
                        <div className="space-y-6">
                            <SectionCard title="Submissions" icon={Users} iconColor="text-blue-600">
                                {subsLoading ? (
                                    <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
                                ) : !submissions || submissions.length === 0 ? (
                                    <EmptyState icon={FileText} message="No submissions yet" />
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                        {submissions.map((s) => {
                                            const statusCls =
                                                s.status === 'GRADED' ? 'bg-green-100 text-green-700'
                                                : s.status === 'FLAGGED' ? 'bg-red-100 text-red-700'
                                                : s.status === 'PENDING_REVIEW' || s.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700'
                                                : 'bg-gray-100 text-gray-600';
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => router.push(`/submissions/lecturer/submissions/${s.id}`)}
                                                    className="w-full text-left p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-sm font-medium text-gray-900 truncate">{s.studentName ?? 'Unknown Student'}</span>
                                                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${statusCls}`}>
                                                            {s.status === 'PENDING_REVIEW' ? 'Pending' : s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                                                        </span>
                                                    </div>
                                                    {s.grade != null && (
                                                        <span className="text-xs text-gray-500">Grade: {s.grade}%</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </SectionCard>

                            {/* Quick Actions */}
                            <SectionCard title="Actions" icon={Edit} iconColor="text-gray-600">
                                <div className="space-y-2">
                                    {subsStats.pending > 0 && (
                                        <button
                                            onClick={() => router.push('/submissions/lecturer/submissions')}
                                            className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <CheckCircle2 size={14} /> Grade Pending ({subsStats.pending})
                                        </button>
                                    )}
                                    {assignment.status === 'DRAFT' && (
                                        <button
                                            onClick={() => router.push(`/submissions/lecturer/assignments/${id}/edit`)}
                                            className="w-full px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <Edit size={14} /> Edit Assignment
                                        </button>
                                    )}
                                    <button
                                        onClick={() => router.push('/submissions/lecturer/assignments')}
                                        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <ArrowLeft size={14} /> Back to All
                                    </button>
                                </div>
                            </SectionCard>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
