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
    RefreshCw,
    Shield,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useAllSubmissions, useAssignments } from '@/hooks/useSubmissions';
import type { Submission } from '@/types/submission.types';

// ─── Helpers ──────────────────────────────────────────────────

function avg(nums: number[]): number | null {
    if (!nums.length) return null;
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function isToday(iso?: string | null): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
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

// ─── Skeleton ─────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────

export default function LecturerDashboardPage() {
    const router = useRouter();

    const { data: submissions, loading: subsLoading, refetch: refetchSubs } = useAllSubmissions();
    const { data: assignments, loading: assgsLoading, refetch: refetchAssgs } = useAssignments();

    const loading = subsLoading || assgsLoading;

    // ── Computed stats
    const stats = useMemo(() => {
        const subs = submissions ?? [];
        const assgs = assignments ?? [];

        const pending = subs.filter((s) =>
            ['SUBMITTED', 'PENDING_REVIEW'].includes(s.status)
        );
        const graded = subs.filter((s) => s.status === 'GRADED');
        const gradedToday = graded.filter((s) => isToday(s.gradedAt));
        const flagged = subs.filter((s) => (s.plagiarismScore ?? 0) >= 20);
        const avgGrade = avg(graded.map((s) => s.grade ?? 0).filter(Boolean));
        const studentIds = new Set(subs.map((s) => s.studentId));
        const openAssgs = assgs.filter((a) => a.status === 'OPEN');

        return {
            totalAssignments: assgs.length,
            activeAssignments: openAssgs.length,
            pendingReview: pending.length,
            gradedToday: gradedToday.length,
            flaggedPlagiarism: flagged.length,
            averageGrade: avgGrade,
            totalStudents: studentIds.size,
            submissionRate:
                assgs.length > 0
                    ? Math.round((subs.filter((s) => s.status !== 'DRAFT').length / (assgs.length * Math.max(studentIds.size, 1))) * 100)
                    : null,
        };
    }, [submissions, assignments]);

    // ── Pending submissions (up to 3)
    const pendingSubmissions = useMemo(() => {
        return (submissions ?? [])
            .filter((s) => ['SUBMITTED', 'PENDING_REVIEW'].includes(s.status))
            .sort((a, b) => {
                const pa = (s: Submission) => (s.plagiarismScore ?? 0) >= 20 ? 0 : 1;
                return pa(a) - pa(b);
            })
            .slice(0, 3);
    }, [submissions]);

    // ── Upcoming deadlines (open assignments, by due date)
    const upcomingDeadlines = useMemo(() => {
        return (assignments ?? [])
            .filter((a) => a.status === 'OPEN' && a.dueDate)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 3);
    }, [assignments]);

    // ── Recent activity (latest N submissions, any status)
    const recentActivity = useMemo(() => {
        return [...(submissions ?? [])]
            .sort((a, b) => {
                const t = (s: Submission) =>
                    s.submittedAt ? new Date(s.submittedAt).getTime() : new Date(s.createdAt).getTime();
                return t(b) - t(a);
            })
            .slice(0, 4);
    }, [submissions]);

    // ── Flagged students (high plagiarism, unique by studentId)
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
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Lecturer Dashboard</h1>
                    <p className="text-gray-600">Overview of your assignments and student submissions</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {loading ? (
                    [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)
                ) : (
                    <>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Pending Review</p>
                                    <p className="text-4xl font-bold mt-1">{stats.pendingReview}</p>
                                </div>
                                <div className="w-14 h-14 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <Clock size={28} />
                                </div>
                            </div>
                            <div className="flex items-center text-blue-100 text-sm">
                                <AlertTriangle size={16} className="mr-1" />
                                Requires attention
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Graded Today</p>
                                    <p className="text-4xl font-bold mt-1">{stats.gradedToday}</p>
                                </div>
                                <div className="w-14 h-14 bg-green-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <CheckCircle2 size={28} />
                                </div>
                            </div>
                            <div className="flex items-center text-green-100 text-sm">
                                <Award size={16} className="mr-1" />
                                Great progress!
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-red-100 text-sm font-medium">Plagiarism Flags</p>
                                    <p className="text-4xl font-bold mt-1">{stats.flaggedPlagiarism}</p>
                                </div>
                                <div className="w-14 h-14 bg-red-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <Shield size={28} />
                                </div>
                            </div>
                            <div className="flex items-center text-red-100 text-sm">
                                <AlertTriangle size={16} className="mr-1" />
                                {stats.flaggedPlagiarism > 0 ? 'Needs review' : 'All clear'}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Class Average</p>
                                    <p className="text-4xl font-bold mt-1">
                                        {stats.averageGrade != null ? `${stats.averageGrade}%` : '–'}
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-purple-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <TrendingUp size={28} />
                                </div>
                            </div>
                            <div className="flex items-center text-purple-100 text-sm">
                                <BarChart3 size={16} className="mr-1" />
                                {stats.totalStudents} student{stats.totalStudents !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Pending Submissions */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Clock className="text-blue-600" size={24} />
                                    Pending Review ({stats.pendingReview})
                                </h2>
                                <button
                                    onClick={() => router.push('/submissions/lecturer/submissions')}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                >
                                    View All →
                                </button>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {loading ? (
                                <div className="p-6 space-y-3 animate-pulse">
                                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                                </div>
                            ) : pendingSubmissions.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <CheckCircle2 size={36} className="mx-auto mb-2 text-green-400" />
                                    No submissions pending review
                                </div>
                            ) : (
                                pendingSubmissions.map((sub) => (
                                    <div key={sub.id} className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {sub.studentName ?? sub.studentId}
                                                    </h3>
                                                    {sub.studentRegistrationId && (
                                                        <span className="text-sm text-gray-500">({sub.studentRegistrationId})</span>
                                                    )}
                                                    {(sub.plagiarismScore ?? 0) >= 20 && (
                                                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-1">
                                                            <AlertTriangle size={12} /> High Plagiarism
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-700 mb-2">
                                                    {sub.assignmentTitle ?? 'Untitled'}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                                                    {sub.moduleCode && <span>{sub.moduleCode}</span>}
                                                    <span>Version {sub.currentVersionNumber}</span>
                                                    {sub.submittedAt && (
                                                        <span>{new Date(sub.submittedAt).toLocaleDateString()} at {new Date(sub.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {sub.wordCount != null && (
                                                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                                            <div className="text-xs text-gray-500">Words</div>
                                                            <div className="text-sm font-bold text-gray-900">{sub.wordCount}</div>
                                                        </div>
                                                    )}
                                                    {sub.plagiarismScore != null && (
                                                        <div className={`p-2 rounded border ${sub.plagiarismScore < 10 ? 'bg-green-50 border-green-200' : sub.plagiarismScore < 20 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                                                            <div className="text-xs text-gray-500">Plagiarism</div>
                                                            <div className={`text-sm font-bold ${sub.plagiarismScore < 10 ? 'text-green-600' : sub.plagiarismScore < 20 ? 'text-amber-600' : 'text-red-600'}`}>
                                                                {sub.plagiarismScore}%
                                                            </div>
                                                        </div>
                                                    )}
                                                    {sub.aiScore != null && (
                                                        <div className="p-2 bg-purple-50 rounded border border-purple-200">
                                                            <div className="text-xs text-gray-500">AI Score</div>
                                                            <div className="text-sm font-bold text-purple-600">{sub.aiScore}/100</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => router.push(`/submissions/lecturer/grading/${sub.id}`)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shrink-0"
                                            >
                                                <Edit size={16} /> Grade
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Upcoming Deadlines */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="text-purple-600" size={24} />
                                Upcoming Deadlines
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {loading ? (
                                <div className="p-6 space-y-3 animate-pulse">
                                    {[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
                                </div>
                            ) : upcomingDeadlines.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No upcoming deadlines</div>
                            ) : (
                                upcomingDeadlines.map((asg) => {
                                    const submitted = asg.submissionsCount ?? 0;
                                    const total = 0; // totalStudents not on Assignment type
                                    return (
                                        <div key={asg.id} className="p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 mb-1">{asg.title}</h3>
                                                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                                        <span className="font-medium">{asg.moduleCode}</span>
                                                        <span>•</span>
                                                        <span>{new Date(asg.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    {submitted > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <Users size={14} className="text-gray-400" />
                                                            <span className="text-sm text-gray-600">{submitted} submitted</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {submitted > 0 && (
                                                    <div className="text-right">
                                                        <div className="text-2xl font-bold text-amber-600">{submitted}</div>
                                                        <div className="text-xs text-gray-500">submissions</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Recent Activity */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="text-purple-600" size={20} />
                                Recent Activity
                            </h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {loading ? (
                                <div className="space-y-3 animate-pulse">
                                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}
                                </div>
                            ) : recentActivity.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
                            ) : (
                                recentActivity.map((item) => (
                                    <div key={item.id} className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.status === 'GRADED' ? 'bg-green-100 text-green-600' : (item.plagiarismScore ?? 0) >= 20 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {item.status === 'GRADED' ? <Award size={18} /> : (item.plagiarismScore ?? 0) >= 20 ? <Shield size={18} /> : <FileText size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900">
                                                <span className="font-medium">{item.studentName ?? item.studentId}</span>{' '}
                                                {item.status === 'GRADED' ? 'graded' : 'submitted'}
                                            </p>
                                            <p className="text-sm text-gray-600 truncate">
                                                {item.assignmentTitle ?? 'Assignment'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {timeAgo(item.submittedAt ?? item.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Flagged Students */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Shield className="text-red-600" size={20} />
                                    Flagged Students
                                </h3>
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                    {flaggedStudents.length}
                                </span>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {loading ? (
                                <div className="p-4 space-y-3 animate-pulse">
                                    {[1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
                                </div>
                            ) : flaggedStudents.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
                                    No plagiarism flags
                                </div>
                            ) : (
                                flaggedStudents.map((s) => (
                                    <div key={s.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">
                                                    {s.studentName ?? s.studentId}
                                                </p>
                                                {s.studentRegistrationId && (
                                                    <p className="text-xs text-gray-500">{s.studentRegistrationId}</p>
                                                )}
                                            </div>
                                            <span className="text-lg font-bold text-red-600">{s.plagiarismScore}%</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-2">{s.assignmentTitle}</p>
                                        <button
                                            onClick={() => router.push('/submissions/lecturer/plagiarism')}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                            <Eye size={12} /> Review Report
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Quick Stats</h3>
                        {loading ? (
                            <div className="space-y-2 animate-pulse">
                                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6" />)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[
                                    { label: 'Total Assignments', value: stats.totalAssignments },
                                    { label: 'Active Assignments', value: stats.activeAssignments, color: 'text-blue-600' },
                                    { label: 'Total Students', value: stats.totalStudents, color: 'text-purple-600' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{label}</span>
                                        <span className={`text-sm font-bold ${color ?? 'text-gray-900'}`}>{value}</span>
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
