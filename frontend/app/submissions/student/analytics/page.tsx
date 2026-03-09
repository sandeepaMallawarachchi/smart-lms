'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Award,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    RefreshCw,
    Shield,
    Star,
    Target,
    TrendingUp,
} from 'lucide-react';
import { useSubmissions } from '@/hooks/useSubmissions';
import type { Submission } from '@/types/submission.types';

// ─── Helpers ──────────────────────────────────────────────────

function avg(nums: number[]): number {
    if (!nums.length) return 0;
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function gradeColor(g: number) {
    if (g >= 90) return 'bg-green-500';
    if (g >= 80) return 'bg-blue-500';
    if (g >= 70) return 'bg-amber-500';
    return 'bg-red-500';
}

function gradeTextColor(g: number) {
    if (g >= 90) return 'text-green-600';
    if (g >= 80) return 'text-blue-600';
    if (g >= 70) return 'text-amber-600';
    return 'text-red-600';
}

function monthLabel(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ─── Skeleton ─────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────

export default function StudentAnalyticsPage() {
    const [studentId, setStudentId] = useState<string | null>(null);

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

    // ── Derived analytics
    const analytics = useMemo(() => {
        const subs = submissions ?? [];
        const graded = subs.filter((s) => s.status === 'GRADED' && s.grade != null);
        const submitted = subs.filter((s) =>
            ['SUBMITTED', 'PENDING_REVIEW', 'GRADED', 'LATE'].includes(s.status)
        );

        const overallGrade = avg(graded.map((s) => s.grade!));
        const avgAIScore = avg(
            subs.filter((s) => s.aiScore != null).map((s) => s.aiScore!)
        );
        const avgPlagiarism = avg(
            subs.filter((s) => s.plagiarismScore != null).map((s) => s.plagiarismScore!)
        );
        const onTime = subs.filter((s) => !s.isLate).length;
        const late = subs.filter((s) => s.isLate).length;
        const submissionRate =
            subs.length > 0 ? Math.round((submitted.length / subs.length) * 100) : 0;

        // Grades by module
        const moduleMap = new Map<string, { name: string; grades: number[]; count: number }>();
        graded.forEach((s) => {
            const code = s.moduleCode ?? 'Unknown';
            const name = s.moduleName ?? code;
            if (!moduleMap.has(code)) moduleMap.set(code, { name, grades: [], count: 0 });
            const m = moduleMap.get(code)!;
            m.grades.push(s.grade!);
            m.count++;
        });
        const gradesByModule = Array.from(moduleMap.entries())
            .map(([code, { name, grades, count }]) => ({
                module: code,
                name,
                grade: avg(grades),
                submissions: count,
            }))
            .sort((a, b) => b.grade - a.grade);

        // Recent grades
        const recentGrades = [...graded]
            .sort((a, b) => {
                const t = (s: Submission) =>
                    s.submittedAt ? new Date(s.submittedAt).getTime() : new Date(s.createdAt).getTime();
                return t(b) - t(a);
            })
            .slice(0, 5);

        // Submission timeline (group by month)
        const timelineMap = new Map<string, { submissions: number; grades: number[] }>();
        subs.forEach((s) => {
            const key = monthLabel(s.createdAt);
            if (!timelineMap.has(key)) timelineMap.set(key, { submissions: 0, grades: [] });
            const entry = timelineMap.get(key)!;
            entry.submissions++;
            if (s.grade != null) entry.grades.push(s.grade);
        });
        const submissionTimeline = Array.from(timelineMap.entries())
            .map(([month, { submissions, grades }]) => ({
                month,
                submissions,
                avgGrade: grades.length ? avg(grades) : null,
            }))
            .slice(-6); // last 6 months

        return {
            overallGrade,
            avgAIScore,
            avgPlagiarism,
            totalSubmissions: subs.length,
            onTimeSubmissions: onTime,
            lateSubmissions: late,
            submissionRate,
            gradesByModule,
            recentGrades,
            submissionTimeline,
        };
    }, [submissions]);

    const maxSubmissions = Math.max(
        ...analytics.submissionTimeline.map((m) => m.submissions),
        1
    );

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">My Performance</h1>
                    <p className="text-gray-600">Track your academic progress and identify areas for improvement</p>
                </div>
                <button
                    onClick={refetch}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Could not load performance data: {error}
                </div>
            )}

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {loading ? (
                    [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)
                ) : (
                    <>
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Overall Grade</p>
                                    <p className="text-4xl font-bold mt-1">
                                        {analytics.overallGrade > 0 ? `${analytics.overallGrade}%` : '–'}
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-green-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <Award size={28} />
                                </div>
                            </div>
                            <div className="flex items-center text-green-100 text-sm">
                                <TrendingUp size={16} className="mr-1" />
                                {analytics.recentGrades.length} graded submission{analytics.recentGrades.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Submission Rate</p>
                                    <p className="text-4xl font-bold mt-1">{analytics.submissionRate}%</p>
                                </div>
                                <div className="w-14 h-14 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <Target size={28} />
                                </div>
                            </div>
                            <div className="flex items-center text-blue-100 text-sm">
                                <CheckCircle2 size={16} className="mr-1" />
                                {analytics.onTimeSubmissions}/{analytics.totalSubmissions} on time
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Avg AI Score</p>
                                    <p className="text-4xl font-bold mt-1">
                                        {analytics.avgAIScore > 0 ? `${analytics.avgAIScore}/100` : '–'}
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-purple-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <Star size={28} />
                                </div>
                            </div>
                            <div className="flex items-center text-purple-100 text-sm">
                                <TrendingUp size={16} className="mr-1" />
                                Across {analytics.totalSubmissions} submission{analytics.totalSubmissions !== 1 ? 's' : ''}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-emerald-100 text-sm font-medium">Academic Integrity</p>
                                    <p className="text-4xl font-bold mt-1">
                                        {analytics.avgPlagiarism > 0 ? `${analytics.avgPlagiarism}%` : '–'}
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-emerald-400 bg-opacity-30 rounded-full flex items-center justify-center">
                                    <Shield size={28} />
                                </div>
                            </div>
                            <div className="flex items-center text-emerald-100 text-sm">
                                <CheckCircle2 size={16} className="mr-1" />
                                {analytics.avgPlagiarism < 10 ? 'Excellent originality' : 'Review sources'}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Grades by Module */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <BarChart3 className="text-purple-600" size={24} />
                                Performance by Module
                            </h2>
                        </div>
                        <div className="p-6">
                            {loading ? (
                                <div className="space-y-4 animate-pulse">
                                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                                </div>
                            ) : analytics.gradesByModule.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No graded submissions yet</p>
                            ) : (
                                <div className="space-y-4">
                                    {analytics.gradesByModule.map((module) => (
                                        <div key={module.module}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{module.module}</p>
                                                    <p className="text-sm text-gray-600">{module.name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-2xl font-bold ${gradeTextColor(module.grade)}`}>
                                                        {module.grade}%
                                                    </p>
                                                    <p className="text-xs text-gray-500">{module.submissions} submission{module.submissions !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3">
                                                <div
                                                    className={`h-3 rounded-full ${gradeColor(module.grade)}`}
                                                    style={{ width: `${module.grade}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submission Timeline */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="text-purple-600" size={24} />
                                Submission Timeline
                            </h2>
                        </div>
                        <div className="p-6">
                            {loading ? (
                                <div className="space-y-4 animate-pulse">
                                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
                                </div>
                            ) : analytics.submissionTimeline.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No submission history yet</p>
                            ) : (
                                <div className="space-y-4">
                                    {analytics.submissionTimeline.map((entry) => (
                                        <div key={entry.month} className="flex items-center gap-4">
                                            <div className="w-16 text-sm font-medium text-gray-700">{entry.month}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm text-gray-600">
                                                        {entry.submissions} submission{entry.submissions !== 1 ? 's' : ''}
                                                    </span>
                                                    {entry.avgGrade != null && (
                                                        <span className="text-sm font-semibold text-purple-600">
                                                            Avg: {entry.avgGrade}%
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-purple-500 h-2 rounded-full"
                                                        style={{ width: `${(entry.submissions / maxSubmissions) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Grades */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Award className="text-purple-600" size={24} />
                                Recent Grades
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {loading ? (
                                <div className="p-6 space-y-3 animate-pulse">
                                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
                                </div>
                            ) : analytics.recentGrades.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No graded submissions yet</div>
                            ) : (
                                analytics.recentGrades.map((item) => (
                                    <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900 mb-1">
                                                    {item.assignmentTitle ?? item.title ?? 'Assignment'}
                                                </p>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    {(item.moduleName || item.moduleCode) && <span>{item.moduleName ?? item.moduleCode}</span>}
                                                    {item.submittedAt && (
                                                        <>
                                                            <span>•</span>
                                                            <span>
                                                                {new Date(item.submittedAt).toLocaleDateString('en-US', {
                                                                    month: 'short', day: 'numeric', year: 'numeric',
                                                                })}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`text-3xl font-bold ${gradeTextColor(item.grade!)}`}>
                                                {item.grade}%
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <BarChart3 className="text-purple-600" size={20} />
                            Submission Summary
                        </h3>
                        {loading ? (
                            <div className="space-y-2 animate-pulse">
                                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6" />)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[
                                    { label: 'Total Submissions', value: analytics.totalSubmissions, color: 'text-gray-900' },
                                    { label: 'On Time', value: analytics.onTimeSubmissions, color: 'text-green-600' },
                                    { label: 'Late', value: analytics.lateSubmissions, color: 'text-red-600' },
                                    { label: 'Modules Covered', value: analytics.gradesByModule.length, color: 'text-purple-600' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">{label}</span>
                                        <span className={`text-sm font-bold ${color}`}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* On-Time Rate */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="text-purple-600" size={20} />
                            Timeliness
                        </h3>
                        {loading ? (
                            <Skeleton className="h-16" />
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">On-Time Rate</span>
                                    <span className="text-lg font-bold text-green-600">
                                        {analytics.totalSubmissions > 0
                                            ? Math.round((analytics.onTimeSubmissions / analytics.totalSubmissions) * 100)
                                            : 0}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{
                                            width: `${analytics.totalSubmissions > 0
                                                ? (analytics.onTimeSubmissions / analytics.totalSubmissions) * 100
                                                : 0}%`,
                                        }}
                                    />
                                </div>
                                {analytics.lateSubmissions > 0 && (
                                    <p className="text-xs text-amber-600 mt-2">
                                        {analytics.lateSubmissions} late submission{analytics.lateSubmissions !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Performance Summary */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-6">
                        <h3 className="font-bold text-purple-900 mb-4">Performance Summary</h3>
                        {loading ? (
                            <div className="space-y-2 animate-pulse">
                                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 bg-purple-200" />)}
                            </div>
                        ) : (
                            <div className="space-y-3 text-sm">
                                {analytics.overallGrade > 0 && (
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                                        <p className="text-gray-700">
                                            Overall average grade: <strong>{analytics.overallGrade}%</strong>
                                        </p>
                                    </div>
                                )}
                                {analytics.submissionRate > 0 && (
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                                        <p className="text-gray-700">
                                            Submission rate: <strong>{analytics.submissionRate}%</strong>
                                        </p>
                                    </div>
                                )}
                                {analytics.avgPlagiarism > 0 && (
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className={`flex-shrink-0 mt-0.5 ${analytics.avgPlagiarism < 10 ? 'text-green-600' : 'text-amber-600'}`} size={16} />
                                        <p className="text-gray-700">
                                            Avg plagiarism similarity: <strong>{analytics.avgPlagiarism}%</strong>
                                            {analytics.avgPlagiarism < 10 ? ' — excellent!' : ' — review needed'}
                                        </p>
                                    </div>
                                )}
                                {analytics.totalSubmissions === 0 && (
                                    <p className="text-gray-500 text-center py-2">Submit assignments to see your performance</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
