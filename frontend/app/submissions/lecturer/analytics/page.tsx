'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle,
    Award,
    BarChart3,
    CheckCircle2,
    Download,
    FileText,
    Filter,
    RefreshCw,
    Shield,
    Star,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useAllSubmissions, useAssignments } from '@/hooks/useSubmissions';
import type { Submission } from '@/types/submission.types';

// ─── Helpers ──────────────────────────────────────────────────

function avg(nums: number[]): number {
    if (!nums.length) return 0;
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function monthKey(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────

export default function LecturerAnalyticsPage() {
    const router = useRouter();
    const [selectedModule, setSelectedModule] = useState('all');

    const { data: rawSubmissions, loading, error, refetch: refetchSubs } = useAllSubmissions();
    const { data: assignments, refetch: refetchAssgs } = useAssignments();

    // Filter by selected module
    const submissions = useMemo(() => {
        const all = rawSubmissions ?? [];
        if (selectedModule === 'all') return all;
        return all.filter((s) => s.moduleCode === selectedModule);
    }, [rawSubmissions, selectedModule]);

    // Distinct modules from submissions
    const modules = useMemo(() => {
        const seen = new Set<string>();
        (rawSubmissions ?? []).forEach((s) => {
            if (s.moduleCode) seen.add(s.moduleCode);
        });
        return Array.from(seen).sort();
    }, [rawSubmissions]);

    // ── Overall stats
    const overallStats = useMemo(() => {
        const subs = submissions;
        const graded = subs.filter((s) => s.status === 'GRADED' && s.grade != null);
        const submitted = subs.filter((s) => s.status !== 'DRAFT');
        const studentIds = new Set(subs.map((s) => s.studentId));
        const onTime = subs.filter((s) => !s.isLate).length;
        const totalVersions = subs.reduce((a, s) => a + (s.totalVersions ?? 1), 0);

        return {
            totalSubmissions: subs.length,
            totalStudents: studentIds.size,
            averageGrade: avg(graded.map((s) => s.grade!)),
            submissionRate: subs.length > 0 ? Math.round((submitted.length / subs.length) * 100) : 0,
            averagePlagiarism: avg(subs.filter((s) => s.plagiarismScore != null).map((s) => s.plagiarismScore!)),
            onTimeRate: subs.length > 0 ? Math.round((onTime / subs.length) * 100) : 0,
            averageVersions: subs.length > 0 ? Math.round((totalVersions / subs.length) * 10) / 10 : 0,
        };
    }, [submissions]);

    // ── Grade distribution
    const gradeDistribution = useMemo(() => {
        const graded = submissions.filter((s) => s.status === 'GRADED' && s.grade != null);
        const buckets = [
            { label: 'A+ (90-100)', min: 90, max: 100, color: 'bg-green-600' },
            { label: 'A (80-89)', min: 80, max: 89, color: 'bg-green-500' },
            { label: 'B (70-79)', min: 70, max: 79, color: 'bg-blue-500' },
            { label: 'C (60-69)', min: 60, max: 69, color: 'bg-amber-500' },
            { label: 'D (50-59)', min: 50, max: 59, color: 'bg-orange-500' },
            { label: 'F (<50)', min: 0, max: 49, color: 'bg-red-500' },
        ];
        return buckets.map((b) => {
            const count = graded.filter((s) => s.grade! >= b.min && s.grade! <= b.max).length;
            const pct = graded.length > 0 ? Math.round((count / graded.length) * 100 * 10) / 10 : 0;
            return { ...b, count, percentage: pct };
        });
    }, [submissions]);

    // ── Plagiarism stats
    const plagiarismStats = useMemo(() => {
        const withScore = submissions.filter((s) => s.plagiarismScore != null);
        const excellent = withScore.filter((s) => s.plagiarismScore! <= 10);
        const good = withScore.filter((s) => s.plagiarismScore! > 10 && s.plagiarismScore! <= 20);
        const warning = withScore.filter((s) => s.plagiarismScore! > 20 && s.plagiarismScore! <= 30);
        const critical = withScore.filter((s) => s.plagiarismScore! > 30);
        const total = withScore.length || 1;
        return {
            excellent: { count: excellent.length, percentage: Math.round((excellent.length / total) * 1000) / 10, range: '0-10%' },
            good: { count: good.length, percentage: Math.round((good.length / total) * 1000) / 10, range: '10-20%' },
            warning: { count: warning.length, percentage: Math.round((warning.length / total) * 1000) / 10, range: '20-30%' },
            critical: { count: critical.length, percentage: Math.round((critical.length / total) * 1000) / 10, range: '30%+' },
        };
    }, [submissions]);

    // ── Submission trends (by month, last 6)
    const submissionTrends = useMemo(() => {
        const map = new Map<string, { total: number; onTime: number; late: number }>();
        submissions.forEach((s) => {
            const key = monthKey(s.createdAt);
            if (!map.has(key)) map.set(key, { total: 0, onTime: 0, late: 0 });
            const entry = map.get(key)!;
            entry.total++;
            if (s.isLate) entry.late++;
            else entry.onTime++;
        });
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([key, v]) => ({ date: monthLabel(key), ...v }));
    }, [submissions]);

    // ── Module performance
    const modulePerformance = useMemo(() => {
        const map = new Map<string, { name: string; studentIds: Set<string>; subs: Submission[] }>();
        submissions.forEach((s) => {
            const code = s.moduleCode ?? 'Unknown';
            if (!map.has(code)) map.set(code, { name: s.moduleName ?? code, studentIds: new Set(), subs: [] });
            const m = map.get(code)!;
            m.studentIds.add(s.studentId);
            m.subs.push(s);
        });
        return Array.from(map.entries()).map(([code, { name, studentIds, subs }]) => {
            const graded = subs.filter((s) => s.status === 'GRADED' && s.grade != null);
            const submitted = subs.filter((s) => s.status !== 'DRAFT');
            return {
                code,
                name,
                students: studentIds.size,
                submissions: subs.length,
                averageGrade: avg(graded.map((s) => s.grade!)),
                plagiarismRate: avg(subs.filter((s) => s.plagiarismScore != null).map((s) => s.plagiarismScore!)),
                completionRate: subs.length > 0 ? Math.round((submitted.length / subs.length) * 1000) / 10 : 0,
            };
        }).sort((a, b) => b.averageGrade - a.averageGrade);
    }, [submissions]);

    // ── Top performers (by avg grade across studentId)
    const topPerformers = useMemo(() => {
        const map = new Map<string, { name: string; grades: number[]; count: number }>();
        submissions
            .filter((s) => s.status === 'GRADED' && s.grade != null)
            .forEach((s) => {
                if (!map.has(s.studentId)) {
                    map.set(s.studentId, { name: s.studentName ?? s.studentId, grades: [], count: 0 });
                }
                const m = map.get(s.studentId)!;
                m.grades.push(s.grade!);
                m.count++;
            });
        return Array.from(map.entries())
            .map(([id, { name, grades, count }]) => ({
                id,
                name,
                averageGrade: avg(grades),
                submissions: count,
                plagiarismScore: avg(
                    submissions.filter((s) => s.studentId === id && s.plagiarismScore != null).map((s) => s.plagiarismScore!)
                ),
            }))
            .sort((a, b) => b.averageGrade - a.averageGrade)
            .slice(0, 5);
    }, [submissions]);

    // ── At-risk students (avg grade < 60 or high plagiarism)
    const atRiskStudents = useMemo(() => {
        const map = new Map<string, { name: string; grades: number[]; plagiarismScores: number[]; missed: number; subs: number }>();
        submissions.forEach((s) => {
            if (!map.has(s.studentId)) {
                map.set(s.studentId, { name: s.studentName ?? s.studentId, grades: [], plagiarismScores: [], missed: 0, subs: 0 });
            }
            const m = map.get(s.studentId)!;
            if (s.grade != null) m.grades.push(s.grade);
            if (s.plagiarismScore != null) m.plagiarismScores.push(s.plagiarismScore);
            if (s.isLate) m.missed++;
            m.subs++;
        });
        return Array.from(map.entries())
            .map(([id, { name, grades, plagiarismScores, missed, subs }]) => ({
                id,
                name,
                averageGrade: avg(grades),
                plagiarismScore: avg(plagiarismScores),
                missedDeadlines: missed,
                submissions: subs,
            }))
            .filter((s) => s.averageGrade < 65 || s.plagiarismScore > 25)
            .sort((a, b) => a.averageGrade - b.averageGrade)
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
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <BarChart3 className="text-blue-600" size={40} />
                        Analytics Dashboard
                    </h1>
                    <p className="text-gray-600">Comprehensive insights into class performance and submission trends</p>
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

            {error && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Could not load analytics data: {error}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-400" />
                        <label className="text-sm text-gray-600">Module:</label>
                        <select
                            value={selectedModule}
                            onChange={(e) => setSelectedModule(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Modules</option>
                            {modules.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {loading ? (
                    [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)
                ) : (
                    <>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                                <FileText size={32} />
                                <TrendingUp size={20} />
                            </div>
                            <div className="text-3xl font-bold mb-1">{overallStats.totalSubmissions}</div>
                            <div className="text-blue-100 text-sm">Total Submissions</div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                                <Award size={32} />
                                <TrendingUp size={20} />
                            </div>
                            <div className="text-3xl font-bold mb-1">
                                {overallStats.averageGrade > 0 ? `${overallStats.averageGrade}%` : '–'}
                            </div>
                            <div className="text-green-100 text-sm">Average Grade</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                                <Users size={32} />
                                <TrendingUp size={20} />
                            </div>
                            <div className="text-3xl font-bold mb-1">{overallStats.submissionRate}%</div>
                            <div className="text-purple-100 text-sm">Submission Rate</div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                                <Shield size={32} />
                                <TrendingDown size={20} />
                            </div>
                            <div className="text-3xl font-bold mb-1">
                                {overallStats.averagePlagiarism > 0 ? `${overallStats.averagePlagiarism}%` : '–'}
                            </div>
                            <div className="text-emerald-100 text-sm">Avg. Plagiarism</div>
                        </div>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Grade Distribution */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Award className="text-blue-600" size={24} />
                        Grade Distribution
                    </h2>
                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                {gradeDistribution.map((item) => (
                                    <div key={item.label}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-gray-500">{item.count} students</span>
                                                <span className="text-sm font-bold text-gray-900">{item.percentage}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className={`${item.color} h-3 rounded-full transition-all`}
                                                style={{ width: `${item.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {overallStats.averageGrade > 0 && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-900">
                                        <strong>Class Average: {overallStats.averageGrade}%</strong>
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Plagiarism Stats */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Shield className="text-green-600" size={24} />
                        Plagiarism Statistics
                    </h2>
                    {loading ? (
                        <Skeleton className="h-40" />
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="text-3xl font-bold text-green-600">{plagiarismStats.excellent.count}</div>
                                    <div className="text-xs text-gray-600 mt-1">Excellent ({plagiarismStats.excellent.range})</div>
                                    <div className="text-sm font-medium text-green-700 mt-1">{plagiarismStats.excellent.percentage}%</div>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="text-3xl font-bold text-blue-600">{plagiarismStats.good.count}</div>
                                    <div className="text-xs text-gray-600 mt-1">Good ({plagiarismStats.good.range})</div>
                                    <div className="text-sm font-medium text-blue-700 mt-1">{plagiarismStats.good.percentage}%</div>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="text-3xl font-bold text-amber-600">{plagiarismStats.warning.count}</div>
                                    <div className="text-xs text-gray-600 mt-1">Warning ({plagiarismStats.warning.range})</div>
                                    <div className="text-sm font-medium text-amber-700 mt-1">{plagiarismStats.warning.percentage}%</div>
                                </div>
                                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                    <div className="text-3xl font-bold text-red-600">{plagiarismStats.critical.count}</div>
                                    <div className="text-xs text-gray-600 mt-1">Critical ({plagiarismStats.critical.range})</div>
                                    <div className="text-sm font-medium text-red-700 mt-1">{plagiarismStats.critical.percentage}%</div>
                                </div>
                            </div>
                            {plagiarismStats.excellent.percentage >= 70 && (
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="text-green-600" size={20} />
                                        <p className="text-sm font-bold text-green-900">Excellent Academic Integrity!</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Submission Trends */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="text-purple-600" size={24} />
                    Submission Trends
                </h2>
                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
                    </div>
                ) : submissionTrends.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No submission trend data yet</p>
                ) : (
                    <>
                        <div className="space-y-4">
                            {submissionTrends.map((week, i) => (
                                <div key={i}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700">{week.date}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-green-600">On-time: {week.onTime}</span>
                                            <span className="text-xs text-red-600">Late: {week.late}</span>
                                            <span className="text-sm font-bold text-gray-900">{week.total} total</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5 w-full h-6 rounded overflow-hidden">
                                        <div
                                            className="bg-green-500"
                                            style={{ width: `${week.total > 0 ? (week.onTime / week.total) * 100 : 0}%` }}
                                        />
                                        <div
                                            className="bg-red-500"
                                            style={{ width: `${week.total > 0 ? (week.late / week.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 grid grid-cols-3 gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                                <div className="text-2xl font-bold text-gray-900">{overallStats.onTimeRate}%</div>
                                <div className="text-xs text-gray-500 mt-1">On-Time Rate</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                                <div className="text-2xl font-bold text-gray-900">{overallStats.averageVersions}</div>
                                <div className="text-xs text-gray-500 mt-1">Avg. Versions</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                                <div className="text-2xl font-bold text-gray-900">{overallStats.totalStudents}</div>
                                <div className="text-xs text-gray-500 mt-1">Total Students</div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Module Performance */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <FileText className="text-blue-600" size={24} />
                    Module Performance
                </h2>
                {loading ? (
                    <Skeleton className="h-48" />
                ) : modulePerformance.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No module data available</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Module</th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Students</th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Submissions</th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Avg. Grade</th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Plagiarism</th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Submission Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modulePerformance.map((m, i) => (
                                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-4 px-4">
                                            <div className="font-semibold text-gray-900">{m.code}</div>
                                            <div className="text-xs text-gray-500">{m.name}</div>
                                        </td>
                                        <td className="text-center py-4 px-4 font-medium text-gray-900">{m.students}</td>
                                        <td className="text-center py-4 px-4 font-medium text-gray-900">{m.submissions}</td>
                                        <td className="text-center py-4 px-4">
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${m.averageGrade >= 80 ? 'bg-green-100 text-green-700' : m.averageGrade >= 70 ? 'bg-blue-100 text-blue-700' : m.averageGrade > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {m.averageGrade > 0 ? `${m.averageGrade}%` : '–'}
                                            </span>
                                        </td>
                                        <td className="text-center py-4 px-4">
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${m.plagiarismRate < 10 ? 'bg-green-100 text-green-700' : m.plagiarismRate < 15 ? 'bg-amber-100 text-amber-700' : m.plagiarismRate > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {m.plagiarismRate > 0 ? `${m.plagiarismRate}%` : '–'}
                                            </span>
                                        </td>
                                        <td className="text-center py-4 px-4">
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${m.completionRate >= 90 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {m.completionRate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Top Performers */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Award className="text-amber-600" size={24} />
                        Top Performers
                    </h2>
                    {loading ? (
                        <div className="space-y-3 animate-pulse">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
                        </div>
                    ) : topPerformers.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No graded submissions yet</p>
                    ) : (
                        <div className="space-y-3">
                            {topPerformers.map((student, index) => (
                                <div
                                    key={student.id}
                                    className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => router.push('/submissions/lecturer/students')}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-bold shadow-lg">
                                            #{index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900">{student.name}</div>
                                            <div className="text-xs text-gray-500">{student.submissions} submission{student.submissions !== 1 ? 's' : ''}</div>
                                        </div>
                                        <div className="text-xl font-bold text-amber-600">{student.averageGrade}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* At-Risk Students */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <AlertTriangle className="text-red-600" size={24} />
                        At-Risk Students
                    </h2>
                    {loading ? (
                        <div className="space-y-3 animate-pulse">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                        </div>
                    ) : atRiskStudents.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                            <p className="text-gray-600">No students at risk!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {atRiskStudents.map((student) => (
                                <div
                                    key={student.id}
                                    className="p-4 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => router.push('/submissions/lecturer/students')}
                                >
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="text-red-600 mt-0.5 shrink-0" size={20} />
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900">{student.name}</div>
                                            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                                                <div className="p-2 bg-white rounded border border-red-200">
                                                    <div className="text-gray-500">Avg Grade</div>
                                                    <div className="font-bold text-red-600">{student.averageGrade > 0 ? `${student.averageGrade}%` : '–'}</div>
                                                </div>
                                                <div className="p-2 bg-white rounded border border-red-200">
                                                    <div className="text-gray-500">Plagiarism</div>
                                                    <div className="font-bold text-red-600">{student.plagiarismScore > 0 ? `${student.plagiarismScore}%` : '–'}</div>
                                                </div>
                                                <div className="p-2 bg-white rounded border border-red-200">
                                                    <div className="text-gray-500">Late</div>
                                                    <div className="font-bold text-red-600">{student.missedDeadlines}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => router.push('/submissions/lecturer/students')}
                        className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                        View All Students
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Active Students', value: overallStats.totalStudents },
                                { label: 'Total Submissions', value: overallStats.totalSubmissions },
                                { label: 'Class Average', value: overallStats.averageGrade > 0 ? `${overallStats.averageGrade}%` : '–' },
                                { label: 'Submission Rate', value: `${overallStats.submissionRate}%` },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <div className="text-3xl font-bold mb-1">{value}</div>
                                    <div className="text-blue-100 text-sm">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
