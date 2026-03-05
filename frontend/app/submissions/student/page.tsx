'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
    AlertTriangle,
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    Eye,
    FileText,
    RefreshCw,
    Shield,
    Star,
    Target,
    TrendingUp,
} from 'lucide-react';
import {useAssignments, useSubmissions} from '@/hooks/useSubmissions';
import type {Submission} from '@/types/submission.types';

const PAGE_LOAD_TIME = Date.now();

// ─── Helpers ──────────────────────────────────────────────────

function getDaysRemaining(dueDate: string) {
    const due = new Date(dueDate);
    const diff = due.getTime() - PAGE_LOAD_TIME;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return {text: `${Math.abs(days)} days overdue`, color: 'text-red-600'};
    if (days === 0) return {text: 'Due today', color: 'text-red-600'};
    if (days === 1) return {text: 'Due tomorrow', color: 'text-amber-600'};
    if (days <= 3) return {text: `${days} days left`, color: 'text-amber-600'};
    return {text: `${days} days left`, color: 'text-gray-600'};
}

function avg(nums: number[]): number | null {
    if (!nums.length) return null;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

// ─── Skeleton ─────────────────────────────────────────────────

function StatSkeleton() {
    return (
        <div className="rounded-lg shadow-lg p-6 bg-gray-200 animate-pulse h-32"/>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function StudentDashboardPage() {
    const router = useRouter();
    const [studentId] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return null;
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.userId ?? payload.sub ?? null;
        } catch {
            return null;
        }
    });
    const [studentName] = useState<string>(() => {
        if (typeof window === 'undefined') return 'Student';
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return 'Student';
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.name ?? payload.username ?? 'Student';
        } catch {
            return 'Student';
        }
    });

    const {
        data: submissions,
        loading: subsLoading,
        error: subsError,
        refetch: refetchSubs
    } = useSubmissions(studentId);
    const {
        data: assignments,
        loading: assgsLoading,
        error: assgsError,
        refetch: refetchAssgs
    } = useAssignments();

    const loading = subsLoading || assgsLoading;

    // ── Computed stats
    const stats = useMemo(() => {
        const subs = Array.isArray(submissions) ? submissions : [];
        const assgs = Array.isArray(assignments) ? assignments : [];

        const submittedIds = new Set(subs.map((s) => s.assignmentId));
        const graded = subs.filter((s) => s.status === 'GRADED');
        const submitted = subs.filter((s) => ['SUBMITTED', 'PENDING_REVIEW'].includes(s.status));
        const drafts = subs.filter((s) => s.status === 'DRAFT');
        const openAssgs = assgs.filter((a) => a.status === 'OPEN');
        const pending = openAssgs.filter((a) => !submittedIds.has(a.id));
        const overdue = pending.filter((a) => a.dueDate && new Date(a.dueDate).getTime() < PAGE_LOAD_TIME);

        const avgGrade = avg(graded.map((s) => s.grade ?? 0).filter((g) => g > 0));
        const avgPlagiarism = avg(
            subs.map((s) => s.plagiarismScore ?? 0).filter((p) => p > 0)
        );
        const submissionRate =
            assgs.length > 0
                ? Math.round(((submitted.length + graded.length) / assgs.length) * 100)
                : null;

        return {
            totalAssignments: assgs.length,
            pending: pending.length,
            inProgress: drafts.length,
            submitted: submitted.length,
            graded: graded.length,
            overdue: overdue.length,
            averageGrade: avgGrade,
            plagiarismScore: avgPlagiarism,
            submissionRate,
        };
    }, [submissions, assignments]);

    // ── Upcoming deadlines (open assignments, sorted by due date)
    const upcomingDeadlines = useMemo(() => {
        return (assignments ?? [])
            .filter((a) => a.status === 'OPEN' && a.dueDate)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 3);
    }, [assignments]);

    // ── Recent submissions
    const recentSubmissions = useMemo(() => {
        return [...(Array.isArray(submissions) ? submissions : [])]
            .sort((a, b) => {
                const t = (s: Submission) =>
                    s.submittedAt ? new Date(s.submittedAt).getTime() : new Date(s.createdAt).getTime();
                return t(b) - t(a);
            })
            .slice(0, 3);
    }, [submissions]);

    // ── Recent feedback (graded submissions = published grades)
    const recentFeedback = useMemo(() => {
        return [...(Array.isArray(submissions) ? submissions : [])]
            .filter((s) => s.status === 'GRADED')
            .sort((a, b) => {
                const t = (s: Submission) =>
                    s.gradedAt ? new Date(s.gradedAt).getTime() : new Date(s.createdAt).getTime();
                return t(b) - t(a);
            })
            .slice(0, 3);
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
                    <p className="text-sm font-medium text-purple-600 mb-1">
                        {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, {studentName.split(' ')[0]}!
                    </p>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">My Dashboard</h1>
                    <p className="text-gray-500">Here&apos;s an overview of your academic progress</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
                    Refresh
                </button>
            </div>

            {/* Error Banner — own API failure (ports 8081-8084) */}
            {(subsError || assgsError) && (
                <div
                    className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="text-red-600 mt-0.5 shrink-0" size={20}/>
                    <div>
                        <p className="font-semibold text-red-800">Failed to load dashboard data</p>
                        <p className="text-sm text-red-600 mt-1">{subsError ?? assgsError}</p>
                        <button onClick={handleRefresh}
                                className="text-sm text-red-700 underline mt-1 hover:text-red-800 cursor-pointer">
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {loading ? (
                    [1, 2, 3, 4].map((i) => <StatSkeleton key={i}/>)
                ) : (
                    <>
                        <div
                            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Total
                                        Assignments</p>
                                    <p className="text-4xl font-bold mt-1">{stats.totalAssignments}</p>
                                </div>
                                <div
                                    className="w-14 h-14 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <FileText size={28}/>
                                </div>
                            </div>
                            <div className="flex items-center text-blue-100 text-sm">
                                <TrendingUp size={16} className="mr-1"/>
                                {stats.pending} open to answer
                            </div>
                        </div>

                        <div
                            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-amber-100 text-sm font-medium">Pending</p>
                                    <p className="text-4xl font-bold mt-1">{stats.pending}</p>
                                </div>
                                <div
                                    className="w-14 h-14 bg-amber-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <Clock size={28}/>
                                </div>
                            </div>
                            <div className="flex items-center text-amber-100 text-sm">
                                <AlertTriangle size={16} className="mr-1"/>
                                {stats.overdue > 0 ? `${stats.overdue} overdue` : 'None overdue'}
                            </div>
                        </div>

                        <div
                            className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Average
                                        Grade</p>
                                    <p className="text-4xl font-bold mt-1">
                                        {stats.averageGrade != null ? `${stats.averageGrade}%` : '–'}
                                    </p>
                                </div>
                                <div
                                    className="w-14 h-14 bg-green-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <Award size={28}/>
                                </div>
                            </div>
                            <div className="flex items-center text-green-100 text-sm">
                                <TrendingUp size={16} className="mr-1"/>
                                {stats.graded} graded submission{stats.graded !== 1 ? 's' : ''}
                            </div>
                        </div>

                        <div
                            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Submission
                                        Rate</p>
                                    <p className="text-4xl font-bold mt-1">
                                        {stats.submissionRate != null ? `${stats.submissionRate}%` : '–'}
                                    </p>
                                </div>
                                <div
                                    className="w-14 h-14 bg-purple-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <Target size={28}/>
                                </div>
                            </div>
                            <div className="flex items-center text-purple-100 text-sm">
                                <CheckCircle2 size={16} className="mr-1"/>
                                {stats.submitted + stats.graded} submitted
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Upcoming Deadlines */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="text-purple-600" size={24}/>
                                Upcoming Deadlines
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {loading ? (
                                <div className="p-6 space-y-3 animate-pulse">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-14 bg-gray-100 rounded"/>
                                    ))}
                                </div>
                            ) : upcomingDeadlines.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Calendar size={36} className="mx-auto mb-2 text-gray-300"/>
                                    No upcoming deadlines
                                </div>
                            ) : (
                                upcomingDeadlines.map((assignment) => {
                                    const deadline = getDaysRemaining(assignment.dueDate);
                                    const isOverdue = deadline.color === 'text-red-600';
                                    return (
                                        <div key={assignment.id}
                                             className={`p-5 hover:bg-gray-50 transition-colors ${isOverdue ? 'border-l-4 border-l-red-400' : ''}`}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 mb-1">{assignment.title}</h3>
                                                    <div
                                                        className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                                        <span
                                                            className="font-medium">{assignment.moduleCode}</span>
                                                        <span>•</span>
                                                        <span>{assignment.totalMarks} marks</span>
                                                    </div>
                                                    <div
                                                        className="flex items-center gap-2 text-sm">
                                                        <Calendar size={14}
                                                                  className="text-gray-400"/>
                                                        <span className="text-gray-600">
                                                            {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                                                                month: 'short', day: 'numeric',
                                                                hour: '2-digit', minute: '2-digit',
                                                            })}
                                                        </span>
                                                        <span
                                                            className={`font-medium ${deadline.color}`}>
                                                            ({deadline.text})
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => router.push(`/submissions/student/answer/${assignment.id}`)}
                                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors text-sm font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                                                >
                                                    <Edit size={14}/>
                                                    Answer
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                            <button
                                onClick={() => router.push('/submissions/student/assignments')}
                                className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2 cursor-pointer"
                            >
                                View All Assignments <span>→</span>
                            </button>
                        </div>
                    </div>

                    {/* Recent Submissions */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="text-purple-600" size={24}/>
                                Recent Submissions
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {loading ? (
                                <div className="p-6 space-y-3 animate-pulse">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="h-20 bg-gray-100 rounded"/>
                                    ))}
                                </div>
                            ) : recentSubmissions.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <FileText size={36} className="mx-auto mb-2 text-gray-300"/>
                                    No submissions yet
                                </div>
                            ) : (
                                recentSubmissions.map((submission) => (
                                    <div key={submission.id}
                                         className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {submission.assignmentTitle ?? submission.title ?? 'Untitled'}
                                                    </h3>
                                                    {submission.status === 'GRADED' ? (
                                                        <span
                                                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                                                            <Award size={12}/> Graded
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-1">
                                                            <CheckCircle2
                                                                size={12}/> {submission.status}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-600 mb-3">
                                                    {submission.moduleCode && <span
                                                        className="font-medium">{submission.moduleCode}</span>}
                                                    {submission.submittedAt && (
                                                        <>
                                                            <span className="mx-2">•</span>
                                                            <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-3">
                                                    {submission.grade != null && (
                                                        <div
                                                            className="p-2 bg-green-50 border border-green-200 rounded">
                                                            <div
                                                                className="text-xs text-gray-600">Grade
                                                            </div>
                                                            <div
                                                                className="text-lg font-bold text-green-600">{submission.grade}%
                                                            </div>
                                                        </div>
                                                    )}
                                                    {submission.plagiarismScore != null && (
                                                        <div
                                                            className={`p-2 border rounded ${submission.plagiarismScore < 10 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                                            <div
                                                                className="text-xs text-gray-600">Plagiarism
                                                            </div>
                                                            <div
                                                                className={`text-lg font-bold ${submission.plagiarismScore < 10 ? 'text-green-600' : 'text-amber-600'}`}>
                                                                {submission.plagiarismScore}%
                                                            </div>
                                                        </div>
                                                    )}
                                                    {submission.aiScore != null && (
                                                        <div
                                                            className="p-2 bg-purple-50 border border-purple-200 rounded">
                                                            <div
                                                                className="text-xs text-gray-600">AI
                                                                Score
                                                            </div>
                                                            <div
                                                                className="text-lg font-bold text-purple-600">{submission.aiScore}/100
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => router.push(`/submissions/student/my-submissions/${submission.id}`)}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer"
                                            >
                                                <Eye size={16}/> View
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                            <button
                                onClick={() => router.push('/submissions/student/my-submissions')}
                                className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2 cursor-pointer"
                            >
                                View All Submissions <span>→</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Academic Integrity */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Shield className="text-purple-600" size={20}/>
                            Academic Integrity
                        </h3>
                        {loading ? (
                            <div className="h-16 bg-gray-100 rounded animate-pulse"/>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span
                                        className="text-sm text-gray-600">Avg. Plagiarism Score</span>
                                    <span
                                        className={`text-lg font-bold ${(stats.plagiarismScore ?? 0) < 10 ? 'text-green-600' : 'text-amber-600'}`}>
                                        {stats.plagiarismScore != null ? `${stats.plagiarismScore}%` : '–'}
                                    </span>
                                </div>
                                {stats.plagiarismScore != null && (
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${stats.plagiarismScore < 10 ? 'bg-green-500' : stats.plagiarismScore < 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{width: `${Math.min(stats.plagiarismScore * 3, 100)}%`}}
                                        />
                                    </div>
                                )}
                                <p className={`text-xs mt-1 font-medium ${(stats.plagiarismScore ?? 0) < 10 ? 'text-green-600' : 'text-amber-600'}`}>
                                    {(stats.plagiarismScore ?? 0) < 10 ? 'Excellent! Keep it up!' : 'Review your sources carefully'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Recent Graded Feedback */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Star className="text-purple-600" size={20}/>
                                Recent Grades
                            </h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {loading ? (
                                <div className="space-y-3 animate-pulse">
                                    {[1, 2, 3].map((i) => <div key={i}
                                                               className="h-12 bg-gray-100 rounded"/>)}
                                </div>
                            ) : recentFeedback.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No graded
                                    submissions yet</p>
                            ) : (
                                recentFeedback.map((item) => (
                                    <div key={item.id} className="flex items-start gap-3">
                                        <div
                                            className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <Award className="text-green-600" size={18}/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {item.assignmentTitle ?? item.title ?? 'Assignment'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Grade: <span
                                                className="font-semibold text-green-600">{item.grade}%</span>
                                                {item.moduleCode && ` · ${item.moduleCode}`}
                                            </p>
                                            {item.gradedAt && (
                                                <p className="text-xs text-gray-400">
                                                    {new Date(item.gradedAt).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Submission Status Overview */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Submission Status</h3>
                        {loading ? (
                            <div className="space-y-2 animate-pulse">
                                {[1, 2, 3, 4].map((i) => <div key={i}
                                                              className="h-6 bg-gray-100 rounded"/>)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[
                                    {dot: 'bg-amber-500', label: 'Pending', value: stats.pending},
                                    {
                                        dot: 'bg-blue-500',
                                        label: 'In Progress (Draft)',
                                        value: stats.inProgress
                                    },
                                    {
                                        dot: 'bg-purple-500',
                                        label: 'Submitted',
                                        value: stats.submitted
                                    },
                                    {dot: 'bg-green-500', label: 'Graded', value: stats.graded},
                                ].map(({dot, label, value}) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 ${dot} rounded-full`}/>
                                            <span className="text-sm text-gray-700">{label}</span>
                                        </div>
                                        <span
                                            className="text-sm font-bold text-gray-900">{value}</span>
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
