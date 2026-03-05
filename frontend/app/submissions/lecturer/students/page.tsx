'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle,
    Clock,
    Eye,
    Filter,
    RefreshCw,
    Search,
    Shield,
    Users,
} from 'lucide-react';
import { useAllSubmissions } from '@/hooks/useSubmissions';
import { useLecturerCourses } from '@/hooks/useLecturerCourses';
import type { Submission } from '@/types/submission.types';

// ─── Helpers ──────────────────────────────────────────────────

function avg(nums: number[]): number {
    if (!nums.length) return 0;
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

type PerformanceStatus = 'excellent' | 'good' | 'average' | 'at-risk' | 'critical';

function getStatus(avgGrade: number, plagiarism: number): PerformanceStatus {
    if (plagiarism > 25) return 'at-risk';
    if (avgGrade >= 85) return 'excellent';
    if (avgGrade >= 75) return 'good';
    if (avgGrade >= 60) return 'average';
    if (avgGrade >= 45) return 'at-risk';
    return 'critical';
}

const STATUS_COLORS: Record<PerformanceStatus, string> = {
    excellent: 'bg-green-100 text-green-700 border-green-200',
    good: 'bg-blue-100 text-blue-700 border-blue-200',
    average: 'bg-amber-100 text-amber-700 border-amber-200',
    'at-risk': 'bg-orange-100 text-orange-700 border-orange-200',
    critical: 'bg-red-100 text-red-700 border-red-200',
};

interface StudentSummary {
    studentId: string;
    name: string;
    registrationId?: string;
    email?: string;
    modules: string[];
    totalSubmissions: number;
    averageGrade: number;
    averagePlagiarism: number;
    averageAiScore: number;
    lateCount: number;
    status: PerformanceStatus;
    flagged: boolean;
    lastActive: string | null;
}

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────

export default function LecturerStudentInsightsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | PerformanceStatus>('all');
    const [filterModule, setFilterModule] = useState('all');
    const [sortBy, setSortBy] = useState<'name' | 'grade' | 'plagiarism' | 'submissions'>('grade');

    const { data: submissions, loading, error, refetch } = useAllSubmissions();
    const { courses } = useLecturerCourses();

    // ── Build student summaries
    const students = useMemo((): StudentSummary[] => {
        const map = new Map<string, {
            name: string;
            registrationId?: string;
            email?: string;
            modules: Set<string>;
            subs: Submission[];
        }>();

        (submissions ?? []).forEach((s) => {
            if (!map.has(s.studentId)) {
                map.set(s.studentId, {
                    name: s.studentName ?? s.studentId,
                    registrationId: s.studentRegistrationId,
                    email: s.studentEmail,
                    modules: new Set(),
                    subs: [],
                });
            }
            const m = map.get(s.studentId)!;
            if (s.studentName) m.name = s.studentName;
            if (s.studentRegistrationId) m.registrationId = s.studentRegistrationId;
            if (s.studentEmail) m.email = s.studentEmail;
            if (s.moduleCode) m.modules.add(s.moduleCode);
            m.subs.push(s);
        });

        return Array.from(map.entries()).map(([id, { name, registrationId, email, modules, subs }]) => {
            const grades = subs.filter((s) => s.grade != null).map((s) => s.grade!);
            const plagiarismScores = subs.filter((s) => s.plagiarismScore != null).map((s) => s.plagiarismScore!);
            const aiScores = subs.filter((s) => s.aiScore != null).map((s) => s.aiScore!);
            const lateCount = subs.filter((s) => s.isLate).length;
            const avgGrade = avg(grades);
            const avgPlagiarism = avg(plagiarismScores);
            const lastActive = subs
                .map((s) => s.submittedAt ?? s.createdAt)
                .filter(Boolean)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

            return {
                studentId: id,
                name,
                registrationId,
                email,
                modules: Array.from(modules),
                totalSubmissions: subs.length,
                averageGrade: avgGrade,
                averagePlagiarism: avgPlagiarism,
                averageAiScore: avg(aiScores),
                lateCount,
                status: getStatus(avgGrade, avgPlagiarism),
                flagged: avgPlagiarism > 25 || subs.some((s) => (s.plagiarismScore ?? 0) > 30),
                lastActive,
            };
        });
    }, [submissions]);


    // Filter + sort
    const filtered = useMemo(() => {
        const list = students.filter((s) => {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                s.name.toLowerCase().includes(q) ||
                (s.registrationId ?? '').toLowerCase().includes(q) ||
                (s.email ?? '').toLowerCase().includes(q);
            const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
            const matchesModule = filterModule === 'all' || s.modules.includes(filterModule);
            return matchesSearch && matchesStatus && matchesModule;
        });

        return [...list].sort((a, b) => {
            switch (sortBy) {
                case 'name': return a.name.localeCompare(b.name);
                case 'grade': return b.averageGrade - a.averageGrade;
                case 'plagiarism': return b.averagePlagiarism - a.averagePlagiarism;
                case 'submissions': return b.totalSubmissions - a.totalSubmissions;
                default: return 0;
            }
        });
    }, [students, searchQuery, filterStatus, filterModule, sortBy]);

    // Overview stats
    const overviewStats = useMemo(() => ({
        total: students.length,
        excellent: students.filter((s) => s.status === 'excellent').length,
        atRisk: students.filter((s) => s.status === 'at-risk' || s.status === 'critical').length,
        flagged: students.filter((s) => s.flagged).length,
    }), [students]);

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <Users className="text-blue-600" size={40} />
                        Student Insights
                    </h1>
                    <p className="text-gray-600">Monitor student performance and identify those who need support</p>
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

            {error && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Could not load student data: {error}
                </div>
            )}

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {loading ? (
                    [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)
                ) : (
                    <>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="text-2xl font-bold text-gray-900">{overviewStats.total}</div>
                            <div className="text-xs text-gray-500 mt-1">Total Students</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="text-2xl font-bold text-green-700">{overviewStats.excellent}</div>
                            <div className="text-xs text-green-600 mt-1">Excellent</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <div className="text-2xl font-bold text-orange-700">{overviewStats.atRisk}</div>
                            <div className="text-xs text-orange-600 mt-1">At Risk</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <div className="text-2xl font-bold text-red-700">{overviewStats.flagged}</div>
                            <div className="text-xs text-red-600 mt-1">Plagiarism Flagged</div>
                        </div>
                    </>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4 flex-wrap">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, ID, or email…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-gray-400" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as never)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="excellent">Excellent</option>
                                <option value="good">Good</option>
                                <option value="average">Average</option>
                                <option value="at-risk">At Risk</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                        <select
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Modules</option>
                            {courses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as never)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="grade">Sort: Grade ↓</option>
                            <option value="name">Sort: Name</option>
                            <option value="plagiarism">Sort: Plagiarism ↓</option>
                            <option value="submissions">Sort: Submissions ↓</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Student List */}
            <div className="space-y-4">
                {loading ? (
                    [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44" />)
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <Users size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg">
                            {students.length === 0 ? 'No student data yet' : 'No students match your filters'}
                        </p>
                    </div>
                ) : (
                    filtered.map((student) => (
                        <div
                            key={student.studentId}
                            className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow ${student.flagged ? 'border-red-200' : 'border-gray-200'}`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                {/* Left */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${
                                            student.status === 'excellent' ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                            : student.status === 'good' ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                            : student.status === 'average' ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                                            : 'bg-gradient-to-br from-red-500 to-red-600'
                                        }`}>
                                            {student.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                                                {student.registrationId && (
                                                    <span className="text-xs text-gray-400">{student.registrationId}</span>
                                                )}
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[student.status]}`}>
                                                    {student.status.replace('-', ' ')}
                                                </span>
                                                {student.flagged && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                        <Shield size={11} /> Plagiarism Flag
                                                    </span>
                                                )}
                                            </div>
                                            {student.email && (
                                                <p className="text-xs text-gray-400">{student.email}</p>
                                            )}
                                            {student.modules.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {student.modules.slice(0, 4).map((m) => (
                                                        <span key={m} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{m}</span>
                                                    ))}
                                                    {student.modules.length > 4 && (
                                                        <span className="text-xs text-gray-400">+{student.modules.length - 4} more</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                                            <div className="text-xs text-gray-500 mb-1">Submissions</div>
                                            <div className="text-lg font-bold text-gray-900">{student.totalSubmissions}</div>
                                        </div>
                                        <div className={`p-3 rounded-lg border text-center ${student.averageGrade >= 80 ? 'bg-green-50 border-green-200' : student.averageGrade >= 65 ? 'bg-blue-50 border-blue-200' : student.averageGrade > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="text-xs text-gray-500 mb-1">Avg Grade</div>
                                            <div className={`text-lg font-bold ${student.averageGrade >= 80 ? 'text-green-600' : student.averageGrade >= 65 ? 'text-blue-600' : student.averageGrade > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                {student.averageGrade > 0 ? `${student.averageGrade}%` : '–'}
                                            </div>
                                        </div>
                                        <div className={`p-3 rounded-lg border text-center ${student.averagePlagiarism < 10 ? 'bg-green-50 border-green-200' : student.averagePlagiarism < 20 ? 'bg-amber-50 border-amber-200' : student.averagePlagiarism > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="text-xs text-gray-500 mb-1">Avg Plagiarism</div>
                                            <div className={`text-lg font-bold ${student.averagePlagiarism < 10 ? 'text-green-600' : student.averagePlagiarism < 20 ? 'text-amber-600' : student.averagePlagiarism > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                {student.averagePlagiarism > 0 ? `${student.averagePlagiarism}%` : '–'}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
                                            <div className="text-xs text-gray-500 mb-1">Avg AI Score</div>
                                            <div className="text-lg font-bold text-purple-600">
                                                {student.averageAiScore > 0 ? student.averageAiScore : '–'}
                                            </div>
                                        </div>
                                        <div className={`p-3 rounded-lg border text-center ${student.lateCount === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                            <div className="text-xs text-gray-500 mb-1">Late</div>
                                            <div className={`text-lg font-bold ${student.lateCount === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                                {student.lateCount}
                                            </div>
                                        </div>
                                    </div>

                                    {student.lastActive && (
                                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                            <Clock size={11} />
                                            Last active: {new Date(student.lastActive).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>

                                {/* Right: actions */}
                                <div className="flex flex-col gap-2 items-end shrink-0">
                                    <button
                                        onClick={() => router.push('/submissions/lecturer/submissions')}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-1.5 text-sm"
                                    >
                                        <Eye size={14} /> View Submissions
                                    </button>
                                    {student.flagged && (
                                        <button
                                            onClick={() => router.push('/submissions/lecturer/plagiarism')}
                                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-medium flex items-center gap-1.5 text-sm"
                                        >
                                            <AlertTriangle size={14} /> Review Flag
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {!loading && filtered.length > 0 && (
                <p className="text-sm text-gray-500 text-right mt-4">
                    Showing {filtered.length} of {students.length} student{students.length !== 1 ? 's' : ''}
                </p>
            )}
        </div>
    );
}
