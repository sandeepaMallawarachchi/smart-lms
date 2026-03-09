'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle,
    Award,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    Eye,
    FileText,
    Shield,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useAllSubmissions, useAssignments } from '@/hooks/useSubmissions';
import {
    PageHeader,
    StatCard,
    Skeleton,
    ErrorBanner,
    SectionCard,
    avg,
} from '@/components/submissions/lecturer/PageShell';
import type { Submission } from '@/types/submission.types';

/* ─── Helpers ──────────────────────────────────────────────── */

function isToday(iso?: string | null): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function timeAgo(iso?: string): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function LecturerDashboardPage() {
    const router = useRouter();
    const { data: submissions, loading: subsLoading, error: subsError, refetch: refetchSubs } = useAllSubmissions();
    const { data: assignments, loading: assgsLoading, error: assgsError, refetch: refetchAssgs } = useAssignments();
    const loading = subsLoading || assgsLoading;

    const stats = useMemo(() => {
        const subs = submissions ?? [];
        const assgs = assignments ?? [];
        const pending = subs.filter((s) => ['SUBMITTED', 'PENDING_REVIEW'].includes(s.status));
        const graded = subs.filter((s) => s.status === 'GRADED');
        const gradedToday = graded.filter((s) => isToday(s.gradedAt));
        const flagged = subs.filter((s) => (s.plagiarismScore ?? 0) >= 20);
        const avgGrade = avg(graded.map((s) => s.grade ?? 0).filter(Boolean));
        const studentIds = new Set(subs.map((s) => s.studentId));
        return {
            pendingReview: pending.length,
            gradedToday: gradedToday.length,
            flaggedPlagiarism: flagged.length,
            averageGrade: avgGrade,
            totalStudents: studentIds.size,
            totalAssignments: assgs.length,
            activeAssignments: assgs.filter((a) => a.status === 'OPEN').length,
        };
    }, [submissions, assignments]);

    const pendingSubmissions = useMemo(() => {
        return (submissions ?? [])
            .filter((s) => ['SUBMITTED', 'PENDING_REVIEW'].includes(s.status))
            .sort((a, b) => {
                const pa = (s: Submission) => ((s.plagiarismScore ?? 0) >= 20 ? 0 : 1);
                return pa(a) - pa(b);
            })
            .slice(0, 4);
    }, [submissions]);

    const upcomingDeadlines = useMemo(() => {
        return (assignments ?? [])
            .filter((a) => a.status === 'OPEN' && a.dueDate)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 3);
    }, [assignments]);

    const recentActivity = useMemo(() => {
        return [...(submissions ?? [])]
            .sort((a, b) => {
                const t = (s: Submission) => (s.submittedAt ? new Date(s.submittedAt).getTime() : new Date(s.createdAt).getTime());
                return t(b) - t(a);
            })
            .slice(0, 5);
    }, [submissions]);

    const flaggedStudents = useMemo(() => {
        const seen = new Set<string>();
        return (submissions ?? [])
            .filter((s) => (s.plagiarismScore ?? 0) >= 20)
            .sort((a, b) => (b.plagiarismScore ?? 0) - (a.plagiarismScore ?? 0))
            .filter((s) => {
                if (seen.has(s.studentId)) return false;
                seen.add(s.studentId);
                return true;
            })
            .slice(0, 5);
    }, [submissions]);

    const handleRefresh = () => {
        refetchSubs();
        refetchAssgs();
    };

    return (
        <div>
            <PageHeader
                title="Lecturer Dashboard"
                subtitle="Overview of your assignments and student submissions"
                icon={BarChart3}
                iconColor="text-blue-600"
                loading={loading}
                onRefresh={handleRefresh}
            />

            {(subsError || assgsError) && <ErrorBanner message={subsError ?? assgsError ?? ''} onRetry={handleRefresh} />}

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {loading ? (
                    [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)
                ) : (
                    <>
                        <StatCard label="Pending Review" value={stats.pendingReview} gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
                        <StatCard label="Graded Today" value={stats.gradedToday} gradient="bg-gradient-to-br from-green-500 to-green-600" />
                        <StatCard label="Plagiarism Flags" value={stats.flaggedPlagiarism} gradient="bg-gradient-to-br from-red-500 to-red-600" />
                        <StatCard
                            label="Class Average"
                            value={stats.averageGrade > 0 ? `${stats.averageGrade}%` : '–'}
                            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                        />
                    </>
                )}
            </div>

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Pending + Deadlines */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Pending Review */}
                    <SectionCard
                        title={`Pending Review (${stats.pendingReview})`}
                        icon={Clock}
                        iconColor="text-blue-600"
                        action={
                            <button
                                onClick={() => router.push('/submissions/lecturer/submissions')}
                                className="text-blue-600 hover:text-blue-700 text-xs font-medium cursor-pointer"
                            >
                                View All →
                            </button>
                        }
                    >
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
                            </div>
                        ) : pendingSubmissions.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                <CheckCircle2 size={28} className="mx-auto mb-2 text-green-400" />
                                No submissions pending review
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 -mx-5 -mb-5">
                                {pendingSubmissions.map((sub) => (
                                    <div key={sub.id} className="px-5 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-medium text-gray-900 text-sm truncate">
                                                    {sub.studentName ?? 'Unknown Student'}
                                                </span>
                                                {(sub.plagiarismScore ?? 0) >= 20 && (
                                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-0.5 shrink-0">
                                                        <AlertTriangle size={10} /> Plagiarism
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">{sub.assignmentTitle ?? 'Untitled'}</p>
                                            <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                                {(sub.moduleName ?? sub.moduleCode) && <span>{sub.moduleName ?? sub.moduleCode}</span>}
                                                <span>v{sub.currentVersionNumber}</span>
                                                {sub.submittedAt && <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {sub.plagiarismScore != null && (
                                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${sub.plagiarismScore < 20 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                    {sub.plagiarismScore}%
                                                </span>
                                            )}
                                            <button
                                                onClick={() => router.push(`/submissions/lecturer/grading/${sub.id}`)}
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
                                            >
                                                <Edit size={12} /> Grade
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* Upcoming Deadlines */}
                    <SectionCard title="Upcoming Deadlines" icon={Calendar} iconColor="text-purple-600">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2].map((i) => <Skeleton key={i} className="h-12" />)}
                            </div>
                        ) : upcomingDeadlines.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No upcoming deadlines</p>
                        ) : (
                            <div className="space-y-3">
                                {upcomingDeadlines.map((asg) => (
                                    <div key={asg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 text-sm truncate">{asg.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                <span>{asg.moduleName ?? asg.moduleCode}</span>
                                                <span>·</span>
                                                <span>
                                                    {new Date(asg.dueDate).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        {(asg.submissionsCount ?? 0) > 0 && (
                                            <span className="text-sm font-bold text-amber-600 shrink-0">
                                                {asg.submissionsCount} <span className="text-xs font-normal text-gray-400">submitted</span>
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Recent Activity */}
                    <SectionCard title="Recent Activity" icon={Clock} iconColor="text-purple-600">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
                            </div>
                        ) : recentActivity.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
                        ) : (
                            <div className="space-y-3">
                                {recentActivity.map((item) => (
                                    <div key={item.id} className="flex items-start gap-2.5">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                item.status === 'GRADED'
                                                    ? 'bg-green-100 text-green-600'
                                                    : (item.plagiarismScore ?? 0) >= 20
                                                      ? 'bg-red-100 text-red-600'
                                                      : 'bg-blue-100 text-blue-600'
                                            }`}
                                        >
                                            {item.status === 'GRADED' ? (
                                                <Award size={14} />
                                            ) : (item.plagiarismScore ?? 0) >= 20 ? (
                                                <Shield size={14} />
                                            ) : (
                                                <FileText size={14} />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-gray-900">
                                                <span className="font-medium">{item.studentName ?? 'Unknown Student'}</span>{' '}
                                                {item.status === 'GRADED' ? 'graded' : 'submitted'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{item.assignmentTitle ?? 'Assignment'}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.submittedAt ?? item.createdAt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* Flagged Students */}
                    <SectionCard
                        title="Flagged Students"
                        icon={Shield}
                        iconColor="text-red-600"
                        action={
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                {flaggedStudents.length}
                            </span>
                        }
                    >
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
                            </div>
                        ) : flaggedStudents.length === 0 ? (
                            <div className="text-center py-4 text-sm text-gray-500">
                                <CheckCircle2 size={24} className="mx-auto mb-1 text-green-400" />
                                No plagiarism flags
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {flaggedStudents.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{s.studentName ?? 'Unknown Student'}</p>
                                            <p className="text-xs text-gray-500 truncate">{s.assignmentTitle}</p>
                                        </div>
                                        <span className="text-sm font-bold text-red-600 shrink-0 ml-2">{s.plagiarismScore}%</span>
                                    </div>
                                ))}
                                <button
                                    onClick={() => router.push('/submissions/lecturer/plagiarism')}
                                    className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 pt-2 cursor-pointer"
                                >
                                    <Eye size={12} /> Review All
                                </button>
                            </div>
                        )}
                    </SectionCard>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <h3 className="font-semibold text-gray-900 text-sm mb-3">Quick Stats</h3>
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-5" />)}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {[
                                    { label: 'Total Assignments', value: stats.totalAssignments },
                                    { label: 'Active Assignments', value: stats.activeAssignments, color: 'text-blue-600' },
                                    { label: 'Total Students', value: stats.totalStudents, color: 'text-purple-600' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">{label}</span>
                                        <span className={`font-bold ${color ?? 'text-gray-900'}`}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
